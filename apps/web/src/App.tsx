import { useEffect, useState } from "react";

type Book = {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  description: string | null;
};

type Health = {
  status: string;
  service: string;
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksError, setBooksError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealthError(true));

    fetch("/v1/books")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load books");
        const json = await r.json();
        setBooks(json.data ?? []);
      })
      .catch((e: Error) => setBooksError(e.message));
  }, []);

  return (
    <div className="app">
      <header className="hero">
        <h1>Mneme</h1>
        <p className="tagline">Memory made social.</p>
        <p>Monorepo scaffold — API, web, and local infrastructure are wired.</p>
        <div className={`status${healthError ? " error" : ""}`}>
          <span className="status-dot" />
          {healthError
            ? "API offline — run docker compose up & npm run dev:api"
            : health
              ? `${health.service} · ${health.status}`
              : "Connecting…"}
        </div>
      </header>

      <section>
        <h2>Library</h2>
        {booksError && <p style={{ color: "#a33" }}>{booksError}</p>}
        {!booksError && books.length === 0 && (
          <p style={{ color: "var(--muted)" }}>
            No books yet — run <code>npm run db:migrate</code> then{" "}
            <code>npm run db:seed</code>
          </p>
        )}
        <div className="books">
          {books.map((book) => (
            <article key={book.id} className="book-card">
              <h3>{book.title}</h3>
              {book.author && <p className="author">{book.author}</p>}
              {book.description && <p>{book.description}</p>}
            </article>
          ))}
        </div>
      </section>

      <footer>
        <p>apps/web · apps/api · docker-compose</p>
      </footer>
    </div>
  );
}
