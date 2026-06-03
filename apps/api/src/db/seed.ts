import { isConnectionRefused, printInfraHint } from "../lib/connectionHint.js";
import { pool } from "./pool.js";
import { CHAPTER_SAMPLES } from "../content/chapters.js";

const DEMO_USER = {
  email: "reader@mneme.local",
  display_name: "Demo Reader",
};

const DEMO_BOOKS = [
  {
    title: "The Odyssey",
    slug: "the-odyssey",
    author: "Homer",
    description: "An epic journey home — memory, longing, and return.",
    cover_key: "covers/odyssey.webp",
  },
  {
    title: "Pride and Prejudice",
    slug: "pride-and-prejudice",
    author: "Jane Austen",
    description: "Wit, society, and the slow work of understanding.",
    cover_key: "covers/pride.webp",
  },
  {
    title: "Meditations",
    slug: "meditations",
    author: "Marcus Aurelius",
    description: "Notes to self from a stoic emperor — quiet reading at its finest.",
    cover_key: "covers/meditations.webp",
  },
];

export async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query<{ id: string }>(
      `INSERT INTO users (email, display_name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      [DEMO_USER.email, DEMO_USER.display_name]
    );
    const userId = userResult.rows[0].id;

    for (const book of DEMO_BOOKS) {
      const bookResult = await client.query<{ id: string }>(
        `INSERT INTO books (title, slug, author, description, cover_key)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title,
           author = EXCLUDED.author,
           description = EXCLUDED.description
         RETURNING id`,
        [book.title, book.slug, book.author, book.description, book.cover_key]
      );
      const bookId = bookResult.rows[0].id;

      const samples = CHAPTER_SAMPLES[book.slug] ?? [
        { title: "Chapter One", html: "<article class=\"chapter\"><p>Chapter one.</p></article>" },
      ];

      for (let i = 0; i < samples.length; i++) {
        const chapterIndex = i + 1;
        const sample = samples[i];
        await client.query(
          `INSERT INTO book_chapters (book_id, chapter_index, title, content_key)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (book_id, chapter_index) DO UPDATE SET
             title = EXCLUDED.title,
             content_key = EXCLUDED.content_key`,
          [
            bookId,
            chapterIndex,
            sample.title,
            `books/${book.slug}/chapters/${chapterIndex}.html`,
          ]
        );
      }

      await client.query(
        `INSERT INTO user_library_items (user_id, book_id, status)
         VALUES ($1, $2, 'reading')
         ON CONFLICT (user_id, book_id) DO NOTHING`,
        [userId, bookId]
      );
    }

    await client.query("COMMIT");
    console.log(`seed complete — demo user: ${DEMO_USER.email}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  if (isConnectionRefused(err)) printInfraHint("postgres");
  else console.error(err);
  process.exit(1);
});
