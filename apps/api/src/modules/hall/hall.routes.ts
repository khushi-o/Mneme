import { Router } from "express";

/** Phase 2 — halls, seats, presence */
export const hallRouter = Router();

hallRouter.get("/status", (_req, res) => {
  res.json({ module: "hall", status: "scaffold" });
});
