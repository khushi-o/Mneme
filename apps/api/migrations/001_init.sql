-- Mneme initial schema (Phase 1 core)
-- See ARCHITECTURE.md §9.1
-- schema_migrations table is created by migrate.ts

-- Identity
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_label  TEXT,
  ip_hash       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

-- Catalog & library
CREATE TABLE IF NOT EXISTS books (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  author        TEXT,
  description   TEXT,
  cover_key     TEXT,
  rag_indexable BOOLEAN NOT NULL DEFAULT false,
  rag_status    TEXT NOT NULL DEFAULT 'pending'
    CHECK (rag_status IN ('pending', 'indexing', 'ready', 'failed')),
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS books_search_idx
  ON books USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(description, '')));

CREATE TABLE IF NOT EXISTS book_chapters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_index INT NOT NULL,
  title         TEXT NOT NULL,
  content_key   TEXT NOT NULL,
  UNIQUE (book_id, chapter_index)
);

CREATE TABLE IF NOT EXISTS user_library_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('want', 'reading', 'finished')),
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS user_library_items_user_status_idx
  ON user_library_items (user_id, status);

-- Reader
CREATE TABLE IF NOT EXISTS reading_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id         UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id      UUID REFERENCES book_chapters(id) ON DELETE SET NULL,
  progress_offset NUMERIC NOT NULL DEFAULT 0,
  progress_cfi    TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS highlights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  range_start   TEXT NOT NULL,
  range_end     TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#C4A574',
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reader_preferences (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  font_size     INT NOT NULL DEFAULT 18,
  line_height   NUMERIC NOT NULL DEFAULT 1.6,
  margin_px     INT NOT NULL DEFAULT 48,
  theme         TEXT NOT NULL DEFAULT 'sepia'
    CHECK (theme IN ('light', 'sepia', 'dark')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency (seat claims, AI jobs)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key           TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_body JSONB NOT NULL,
  status_code   INT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);

-- RAG (Phase 3 — tables created now, used later)
CREATE TABLE IF NOT EXISTS book_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id   UUID NOT NULL REFERENCES book_chapters(id) ON DELETE CASCADE,
  chunk_index  INT NOT NULL,
  content      TEXT NOT NULL,
  token_count  INT NOT NULL,
  cfi_start    TEXT,
  cfi_end      TEXT,
  embedding    vector(1536),
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, chapter_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS book_chunks_book_id_idx ON book_chunks (book_id);

CREATE TABLE IF NOT EXISTS highlight_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  highlight_id UUID NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
  book_id      UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  embedding    vector(1536),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS highlight_chunks_user_book_idx
  ON highlight_chunks (user_id, book_id);
