import { Router } from "express";
import { pool } from "../../db/pool.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      service: "mneme-api",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});
