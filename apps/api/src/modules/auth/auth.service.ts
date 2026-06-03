import { SignJWT, jwtVerify } from "jose";
import { config } from "../../config.js";
import { pool } from "../../db/pool.js";
import { generateToken, hashToken } from "../../lib/tokens.js";
import { AppError } from "../../middleware/errorHandler.js";

const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;
const MAGIC_LINK_TTL_SEC = 15 * 60;

type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
};

function jwtSecretKey() {
  return new TextEncoder().encode(config.jwtSecret);
}

async function findOrCreateUser(email: string): Promise<UserRow> {
  const displayName = email.split("@")[0] ?? "Reader";

  const inserted = await pool.query<UserRow>(
    `INSERT INTO users (email, display_name) VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, display_name`,
    [email, displayName]
  );
  if (inserted.rows[0]) return inserted.rows[0];

  const existing = await pool.query<UserRow>(
    `SELECT id, email, display_name FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );
  if (!existing.rows[0]) {
    throw new AppError(500, "Could not create user", "USER_CREATE_FAILED");
  }
  return existing.rows[0];
}

async function signAccessToken(user: UserRow, sessionId: string): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    sid: sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(jwtSecretKey());
}

async function createSession(userId: string, deviceLabel?: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO sessions (user_id, device_label) VALUES ($1, $2) RETURNING id`,
    [userId, deviceLabel ?? "web"]
  );
  return result.rows[0].id;
}

async function issueTokenPair(user: UserRow, sessionId: string) {
  const refreshToken = generateToken();
  const refreshHash = hashToken(refreshToken);
  const refreshExpires = new Date(Date.now() + REFRESH_TTL_SEC * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (session_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [sessionId, refreshHash, refreshExpires]
  );

  const accessToken = await signAccessToken(user, sessionId);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TTL_SEC,
    token_type: "Bearer" as const,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
    },
  };
}

export async function requestMagicLink(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new AppError(400, "Valid email required", "INVALID_EMAIL");
  }

  await findOrCreateUser(normalized);

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_SEC * 1000);

  await pool.query(
    `INSERT INTO magic_link_tokens (email, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [normalized, tokenHash, expiresAt]
  );

  const verifyPath = `/?token=${encodeURIComponent(rawToken)}`;
  const magicLink = `${config.webUrl}${verifyPath}`;

  if (config.isDev) {
    console.log("\n--- Mneme magic link (dev) ---");
    console.log(magicLink);
    console.log("----------------------------\n");
  }

  return {
    message: "If that email is valid, a sign-in link was sent.",
    ...(config.isDev ? { dev_magic_link: magicLink } : {}),
  };
}

export async function verifyMagicLink(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const linkResult = await pool.query<{
    id: string;
    email: string;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT id, email, expires_at, used_at FROM magic_link_tokens WHERE token_hash = $1`,
    [tokenHash]
  );

  const link = linkResult.rows[0];
  if (!link) {
    throw new AppError(401, "Invalid or expired link", "INVALID_MAGIC_LINK");
  }
  if (link.used_at) {
    throw new AppError(401, "Link already used", "MAGIC_LINK_USED");
  }
  if (new Date(link.expires_at) < new Date()) {
    throw new AppError(401, "Link expired", "MAGIC_LINK_EXPIRED");
  }

  const user = await findOrCreateUser(link.email);
  const sessionId = await createSession(user.id);

  await pool.query(`UPDATE magic_link_tokens SET used_at = now() WHERE id = $1`, [
    link.id,
  ]);

  return issueTokenPair(user, sessionId);
}

export async function refreshTokens(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);

  const result = await pool.query<{
    id: string;
    session_id: string;
    expires_at: Date;
    revoked_at: Date | null;
    user_id: string;
    email: string;
    display_name: string | null;
  }>(
    `SELECT rt.id, rt.session_id, rt.expires_at, rt.revoked_at,
            u.id AS user_id, u.email, u.display_name
     FROM refresh_tokens rt
     JOIN sessions s ON s.id = rt.session_id
     JOIN users u ON u.id = s.user_id
     WHERE rt.token_hash = $1 AND s.revoked_at IS NULL AND u.deleted_at IS NULL`,
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row || row.revoked_at) {
    throw new AppError(401, "Invalid refresh token", "INVALID_REFRESH");
  }
  if (new Date(row.expires_at) < new Date()) {
    throw new AppError(401, "Refresh token expired", "REFRESH_EXPIRED");
  }

  await pool.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [
    row.id,
  ]);

  const user: UserRow = {
    id: row.user_id,
    email: row.email,
    display_name: row.display_name,
  };

  return issueTokenPair(user, row.session_id);
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);

  const result = await pool.query<{ session_id: string }>(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL
     RETURNING session_id`,
    [tokenHash]
  );

  if (result.rows[0]) {
    await pool.query(`UPDATE sessions SET revoked_at = now() WHERE id = $1`, [
      result.rows[0].session_id,
    ]);
  }

  return { message: "Signed out" };
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey());
    const sub = payload.sub;
    const email = payload.email;
    const sid = payload.sid;

    if (typeof sub !== "string" || typeof email !== "string" || typeof sid !== "string") {
      throw new AppError(401, "Invalid token", "INVALID_TOKEN");
    }

    const session = await pool.query(
      `SELECT id FROM sessions WHERE id = $1 AND revoked_at IS NULL`,
      [sid]
    );
    if (session.rowCount === 0) {
      throw new AppError(401, "Session revoked", "SESSION_REVOKED");
    }

    return { id: sub, email, sessionId: sid };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, "Invalid or expired token", "INVALID_TOKEN");
  }
}

export async function getUserById(userId: string) {
  const result = await pool.query<UserRow>(
    `SELECT id, email, display_name FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!result.rows[0]) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }
  return result.rows[0];
}
