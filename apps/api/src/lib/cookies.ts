import type { Response } from "express";
import { config } from "../config.js";

export const ACCESS_COOKIE = "mneme_access";
export const REFRESH_COOKIE = "mneme_refresh";

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;

function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec * 1000,
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
) {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL_SEC));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_SEC));
}

export function clearAuthCookies(res: Response) {
  const base = { path: "/", httpOnly: true, sameSite: "lax" as const };
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
