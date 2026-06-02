import { pool } from "./pool.js";

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

      await client.query(
        `INSERT INTO book_chapters (book_id, chapter_index, title, content_key)
         VALUES ($1, 1, 'Chapter One', $2)
         ON CONFLICT (book_id, chapter_index) DO NOTHING`,
        [bookId, `books/${book.slug}/chapters/1.html`]
      );

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
  console.error(err);
  process.exit(1);
});
