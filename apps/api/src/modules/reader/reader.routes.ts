import { Router } from "express";

/** Phase 1 — progress, highlights, preferences */
export const readerRouter = Router();

readerRouter.get("/status", (_req, res) => {
  res.json({ module: "reader", status: "scaffold" });
});
