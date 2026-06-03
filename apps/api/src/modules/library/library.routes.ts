import { Router } from "express";
import { pool } from "../../db/pool.js";
import { AppError } from "../../middleware/errorHandler.js";

export const libraryRouter = Router();

libraryRouter.get("/books", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, slug, author, description, cover_key, metadata, created_at
       FROM books
       ORDER BY title ASC`
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

libraryRouter.get("/books/:slug", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, slug, author, description, cover_key, metadata, created_at
       FROM books WHERE slug = $1`,
      [req.params.slug]
    );
    if (rows.length === 0) {
      throw new AppError(404, "Book not found", "BOOK_NOT_FOUND");
    }

    const chapters = await pool.query(
      `SELECT id, chapter_index, title, content_key
       FROM book_chapters
       WHERE book_id = $1
       ORDER BY chapter_index ASC`,
      [rows[0].id]
    );

    res.json({
      data: {
        ...rows[0],
        chapters: chapters.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});
