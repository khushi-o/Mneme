import type { NextFunction, Request, Response } from "express";
import { ACCESS_COOKIE } from "../lib/cookies.js";
import { verifyAccessToken } from "../modules/auth/auth.service.js";
import { AppError } from "./errorHandler.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const cookieToken = req.cookies?.[ACCESS_COOKIE] as string | undefined;

  let token: string | undefined;
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
    return;
  }

  try {
    req.user = await verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
}
