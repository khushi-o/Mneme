import { useCallback, useEffect, useState } from "react";
import { LoginForm } from "./components/LoginForm";
import { Reader } from "./components/Reader";
import {
  authFetch,
  consumeVerifyTokenFromUrl,
  fetchMe,
  logout,
  verifyMagicLink,
  type AuthUser,
} from "./lib/auth";

type Book = {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  description: string | null;
};

type LibraryItem = {
  id: string;
  status: string;
  book_id: string;
  title: string;
  slug: string;
  author: string | null;
  description: string | null;
};

type Health = {
  status: string;
  service: string;
};

type View =
  | { type: "home" }
  | { type: "reader"; slug: string; bookId: string };

export default function App() {
  const [view, setView] = useState<View>({ type: "home" });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [myLibrary, setMyLibrary] = useState<LibraryItem[]>([]);
  const [booksError, setBooksError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
    return me;
  }, []);

  const loadLibrary = useCallback(async (signedIn: boolean) => {
    const booksRes = await fetch("/v1/books");
    if (booksRes.ok) {
      const json = await booksRes.json();
      setBooks(json.data ?? []);
    } else {
      setBooksError("Failed to load catalog");
    }

    if (signedIn) {
      const libRes = await authFetch("/v1/me/library");
      if (libRes.ok) {
        const json = await libRes.json();
        setMyLibrary(json.data ?? []);
      }
    } else {
      setMyLibrary([]);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const verifyToken = consumeVerifyTokenFromUrl();
      if (verifyToken) {
        try {
          await verifyMagicLink(verifyToken);
        } catch {
          setBooksError("Sign-in link invalid or expired");
        }
      }

      fetch("/health")
        .then((r) => r.json())
        .then(setHealth)
        .catch(() => setHealthError(true));

      const me = await loadSession();
      await loadLibrary(!!me);
      setAuthLoading(false);
    }
    init();
  }, [loadSession, loadLibrary]);

  async function handleLogout() {
    await logout();
    setUser(null);
    setMyLibrary([]);
    setView({ type: "home" });
  }

  function openReader(item: LibraryItem) {
    setView({ type: "reader", slug: item.slug, bookId: item.book_id });
  }

  if (authLoading) {
    return (
      <div className="app">
        <p className="loading">Loading…</p>
      </div>
    );
  }

  if (view.type === "reader" && user) {
    return (
      <Reader
        slug={view.slug}
        bookId={view.bookId}
        onClose={() => setView({ type: "home" })}
      />
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-top">
          <div>
            <h1>Mneme</h1>
            <p className="tagline">Memory made social.</p>
          </div>
          {user && (
            <div className="user-bar">
              <span>{user.display_name ?? user.email}</span>
              <button type="button" className="btn-ghost" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
        <div className={`status${healthError ? " error" : ""}`}>
          <span className="status-dot" />
          {healthError
            ? "API offline"
            : health
              ? `${health.service} · ${health.status}`
              : "Connecting…"}
        </div>
      </header>

      {!user ? (
        <LoginForm />
      ) : (
        <>
          <section>
            <h2>My library</h2>
            {myLibrary.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No books on your shelf yet.</p>
            ) : (
              <div className="books">
                {myLibrary.map((item) => (
                  <article
                    key={item.id}
                    className="book-card book-card-clickable"
                    onClick={() => openReader(item)}
                    onKeyDown={(e) => e.key === "Enter" && openReader(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="badge-status">{item.status}</span>
                    <h3>{item.title}</h3>
                    {item.author && <p className="author">{item.author}</p>}
                    {item.description && <p>{item.description}</p>}
                    <span className="read-cta">Read →</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: "2rem" }}>
            <h2>Catalog</h2>
            {booksError && <p style={{ color: "#a33" }}>{booksError}</p>}
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
        </>
      )}

      <footer>
        <p>Phase 1 · Reader · MinIO chapters + progress</p>
      </footer>
    </div>
  );
}
