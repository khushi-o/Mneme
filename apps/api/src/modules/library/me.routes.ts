import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { AppError } from "../../middleware/errorHandler.js";
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

meLibraryRouter.post("/library", async (req, res, next) => {
  try {
    const body = z
      .object({
        book_id: z.string().uuid(),
        status: z.enum(["want", "reading", "finished"]).default("want"),
      })
      .parse(req.body);

    const book = await pool.query(`SELECT id FROM books WHERE id = $1`, [body.book_id]);
    if (book.rowCount === 0) {
      next(new AppError(404, "Book not found", "BOOK_NOT_FOUND"));
      return;
    }

    const inserted = await pool.query(
      `INSERT INTO user_library_items (user_id, book_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, book_id) DO NOTHING
       RETURNING id, status, added_at`,
      [req.user!.id, body.book_id, body.status]
    );

    if (inserted.rowCount === 0) {
      next(new AppError(409, "Book already on your shelf", "ALREADY_IN_LIBRARY"));
      return;
    }

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
       WHERE uli.id = $1`,
      [inserted.rows[0].id]
    );

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(400, "book_id required", "INVALID_BODY"));
      return;
    }
    next(err);
  }
});
