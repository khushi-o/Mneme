import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../modules/auth/auth.service.js";
import { AppError } from "./errorHandler.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
    return;
  }

  const token = header.slice(7);
  try {
    req.user = await verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
}
