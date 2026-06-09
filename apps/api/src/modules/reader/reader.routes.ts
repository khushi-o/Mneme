import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { clientMessage } from "../../lib/clientMessage.js";
import { sanitizeChapterHtml } from "../../lib/sanitizeHtml.js";
import { getObjectText } from "../../lib/storage.js";
import { isObjectNotFound } from "../../lib/storageErrors.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { AppError } from "../../middleware/errorHandler.js";

export const readerRouter = Router();

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

async function getBookBySlug(slug: string) {
  const { rows } = await pool.query<{ id: string; slug: string; title: string }>(
    `SELECT id, slug, title FROM books WHERE slug = $1`,
    [slug]
  );
  if (!rows[0]) throw new AppError(404, "Book not found", "BOOK_NOT_FOUND");
  return rows[0];
}

async function getChapter(bookId: string, chapterIndex: number) {
  const { rows } = await pool.query<{
    id: string;
    title: string;
    content_key: string;
    chapter_index: number;
  }>(
    `SELECT id, title, content_key, chapter_index
     FROM book_chapters
     WHERE book_id = $1 AND chapter_index = $2`,
    [bookId, chapterIndex]
  );
  if (!rows[0]) throw new AppError(404, "Chapter not found", "CHAPTER_NOT_FOUND");
  return rows[0];
}

async function assertLibraryAccess(userId: string, bookId: string) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM user_library_items WHERE user_id = $1 AND book_id = $2`,
    [userId, bookId]
  );
  if (rowCount === 0) {
    throw new AppError(403, "Add this book to your library to read it", "LIBRARY_REQUIRED");
  }
}

readerRouter.get("/books/:slug/chapters", requireAuth, async (req, res, next) => {
  try {
    const book = await getBookBySlug(param(req.params.slug));
    await assertLibraryAccess(req.user!.id, book.id);

    const { rows } = await pool.query<{
      id: string;
      chapter_index: number;
      title: string;
    }>(
      `SELECT id, chapter_index, title
       FROM book_chapters
       WHERE book_id = $1
       ORDER BY chapter_index ASC`,
      [book.id]
    );

    res.json({
      data: {
        book_id: book.id,
        book_slug: book.slug,
        book_title: book.title,
        chapters: rows,
        total: rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

readerRouter.get(
  "/books/:slug/chapters/:chapterIndex/content",
  requireAuth,
  async (req, res, next) => {
    try {
      const chapterIndex = parseInt(param(req.params.chapterIndex), 10);
      if (Number.isNaN(chapterIndex) || chapterIndex < 1) {
        throw new AppError(400, "Invalid chapter index", "INVALID_CHAPTER");
      }

      const book = await getBookBySlug(param(req.params.slug));
      await assertLibraryAccess(req.user!.id, book.id);
      const chapter = await getChapter(book.id, chapterIndex);

      let raw: string;
      try {
        raw = await getObjectText(chapter.content_key);
      } catch (err) {
        if (isObjectNotFound(err)) {
          throw new AppError(
            404,
            clientMessage(
              "Chapter file missing in MinIO. Run npm run docker:up, then npm run db:seed-content.",
              "This chapter is not available yet. Please try again later."
            ),
            "CONTENT_NOT_FOUND"
          );
        }
        throw err;
      }

      const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const extracted = bodyMatch ? bodyMatch[1].trim() : raw;
      const html = sanitizeChapterHtml(extracted);

      res.json({
        data: {
          book_id: book.id,
          book_slug: book.slug,
          book_title: book.title,
          chapter_id: chapter.id,
          chapter_index: chapter.chapter_index,
          chapter_title: chapter.title,
          html,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

readerRouter.get(
  "/me/reading-sessions/:bookId",
  requireAuth,
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, book_id, chapter_id, progress_offset, progress_cfi, updated_at
         FROM reading_sessions
         WHERE user_id = $1 AND book_id = $2`,
        [req.user!.id, param(req.params.bookId)]
      );
      res.json({ data: rows[0] ?? null });
    } catch (err) {
      next(err);
    }
  }
);

readerRouter.put(
  "/me/reading-sessions/:bookId",
  requireAuth,
  async (req, res, next) => {
    try {
      const body = z
        .object({
          chapter_id: z.string().uuid().optional(),
          progress_offset: z.number().min(0).max(100),
          progress_cfi: z.string().optional(),
        })
        .parse(req.body);

      await assertLibraryAccess(req.user!.id, param(req.params.bookId));

      const { rows } = await pool.query(
        `INSERT INTO reading_sessions (user_id, book_id, chapter_id, progress_offset, progress_cfi, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (user_id, book_id) DO UPDATE SET
           chapter_id = COALESCE(EXCLUDED.chapter_id, reading_sessions.chapter_id),
           progress_offset = EXCLUDED.progress_offset,
           progress_cfi = COALESCE(EXCLUDED.progress_cfi, reading_sessions.progress_cfi),
           updated_at = now()
         RETURNING id, book_id, chapter_id, progress_offset, progress_cfi, updated_at`,
        [
          req.user!.id,
          param(req.params.bookId),
          body.chapter_id ?? null,
          body.progress_offset,
          body.progress_cfi ?? null,
        ]
      );

      res.json({ data: rows[0] });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(400, "Invalid progress payload", "INVALID_BODY"));
        return;
      }
      next(err);
    }
  }
);

readerRouter.get("/me/reader-preferences", requireAuth, async (req, res, next) => {
  try {
    let { rows } = await pool.query(
      `SELECT font_size, line_height, margin_px, theme, updated_at
       FROM reader_preferences WHERE user_id = $1`,
      [req.user!.id]
    );

    if (!rows[0]) {
      const created = await pool.query(
        `INSERT INTO reader_preferences (user_id) VALUES ($1)
         RETURNING font_size, line_height, margin_px, theme, updated_at`,
        [req.user!.id]
      );
      rows = created.rows;
    }

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

readerRouter.patch("/me/reader-preferences", requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        font_size: z.number().int().min(14).max(28).optional(),
        line_height: z.number().min(1.2).max(2.4).optional(),
        margin_px: z.number().int().min(16).max(120).optional(),
        theme: z.enum(["light", "sepia", "dark"]).optional(),
      })
      .parse(req.body);

    const { rows } = await pool.query(
      `INSERT INTO reader_preferences (user_id, font_size, line_height, margin_px, theme, updated_at)
       VALUES ($1, COALESCE($2, 18), COALESCE($3, 1.6), COALESCE($4, 48), COALESCE($5, 'sepia'), now())
       ON CONFLICT (user_id) DO UPDATE SET
         font_size = COALESCE($2, reader_preferences.font_size),
         line_height = COALESCE($3, reader_preferences.line_height),
         margin_px = COALESCE($4, reader_preferences.margin_px),
         theme = COALESCE($5, reader_preferences.theme),
         updated_at = now()
       RETURNING font_size, line_height, margin_px, theme, updated_at`,
      [
        req.user!.id,
        body.font_size ?? null,
        body.line_height ?? null,
        body.margin_px ?? null,
        body.theme ?? null,
      ]
    );

    res.json({ data: rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(400, "Invalid preferences", "INVALID_BODY"));
      return;
    }
    next(err);
  }
});
