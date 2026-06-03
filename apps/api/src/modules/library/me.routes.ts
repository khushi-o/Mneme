import { Router } from "express";
import { pool } from "../../db/pool.js";
import { requireAuth } from "../../middleware/requireAuth.js";

export const meLibraryRouter = Router();

meLibraryRouter.use(requireAuth);

meLibraryRouter.get("/library", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         uli.id,
         uli.status,
         uli.added_at,
         b.id AS book_id,
         b.title,
         b.slug,
         b.author,
         b.description,
         b.cover_key
       FROM user_library_items uli
       JOIN books b ON b.id = uli.book_id
       WHERE uli.user_id = $1
       ORDER BY uli.added_at DESC`,
      [req.user!.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});
