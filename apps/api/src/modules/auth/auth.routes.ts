import { Router } from "express";

/** Phase 1 — auth routes (magic link / OAuth) land here */
export const authRouter = Router();

authRouter.get("/status", (_req, res) => {
  res.json({ module: "auth", status: "scaffold" });
});
