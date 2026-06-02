import { Router } from "express";

/** Phase 3 — RAG, conversations, quick actions */
export const aiRouter = Router();

aiRouter.get("/status", (_req, res) => {
  res.json({ module: "ai", status: "scaffold" });
});
