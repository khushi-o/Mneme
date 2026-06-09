import { Router } from "express";
import { z } from "zod";
import {
  ACCESS_TTL_SEC,
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
} from "../../lib/cookies.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { AppError } from "../../middleware/errorHandler.js";
import { authRateLimit, magicLinkRateLimit } from "../../middleware/rateLimit.js";
import {
  getUserById,
  logout,
  refreshTokens,
  requestMagicLink,
  verifyMagicLink,
} from "./auth.service.js";

export const authRouter = Router();

authRouter.use(authRateLimit);

authRouter.post("/magic-link", magicLinkRateLimit, async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const result = await requestMagicLink(body.email);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(400, "Valid email required", "INVALID_EMAIL"));
      return;
    }
    next(err);
  }
});

authRouter.post("/verify", async (req, res, next) => {
  try {
    const body = z.object({ token: z.string().min(10) }).parse(req.body);
    const tokens = await verifyMagicLink(body.token);
    setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    res.json({
      expires_in: ACCESS_TTL_SEC,
      user: tokens.user,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(400, "Token required", "INVALID_BODY"));
      return;
    }
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) {
      next(new AppError(401, "Session expired", "NO_REFRESH_TOKEN"));
      return;
    }
    const tokens = await refreshTokens(refreshToken);
    setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    res.json({
      expires_in: ACCESS_TTL_SEC,
      user: tokens.user,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (refreshToken) {
      await logout(refreshToken);
    }
    clearAuthCookies(res);
    res.json({ message: "Signed out" });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.user!.id);
    res.json({
      data: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      },
    });
  } catch (err) {
    next(err);
  }
});
