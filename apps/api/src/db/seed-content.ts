import { isConnectionRefused, printInfraHint } from "../lib/connectionHint.js";
import { pool } from "./pool.js";
import { CHAPTER_SAMPLES } from "../content/chapters.js";
import { ensureBucket, putObject } from "../lib/storage.js";

export async function seedChapters(): Promise<void> {
  await ensureBucket();

  const { rows } = await pool.query<{
    slug: string;
    content_key: string;
    chapter_index: number;
  }>(
    `SELECT b.slug, bc.content_key, bc.chapter_index
     FROM book_chapters bc
     JOIN books b ON b.id = bc.book_id
     ORDER BY b.slug, bc.chapter_index`
  );

  for (const row of rows) {
    const samples = CHAPTER_SAMPLES[row.slug];
    const sample = samples?.[row.chapter_index - 1];
    if (!sample) continue;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"></head><body>${sample.html}</body></html>`;

    await putObject(row.content_key, html, "text/html; charset=utf-8");
    console.log(`uploaded ${row.content_key}`);
  }

  console.log("chapter content seed complete");
}

seedChapters()
  .catch((err) => {
    if (isConnectionRefused(err)) printInfraHint("minio");
    else console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
