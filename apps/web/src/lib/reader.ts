import { authFetch } from "./auth";

export type ReaderPrefs = {
  font_size: number;
  line_height: number;
  margin_px: number;
  theme: "light" | "sepia" | "dark";
};

export type ChapterContent = {
  book_id: string;
  book_slug: string;
  book_title: string;
  chapter_id: string;
  chapter_index: number;
  chapter_title: string;
  html: string;
};

export type ChapterMeta = {
  id: string;
  chapter_index: number;
  title: string;
};

export type BookChapters = {
  book_id: string;
  book_slug: string;
  book_title: string;
  chapters: ChapterMeta[];
  total: number;
};

export type ReadingProgress = {
  id: string;
  book_id: string;
  chapter_id: string | null;
  progress_offset: number;
  progress_cfi: string | null;
  updated_at: string;
};

async function readerApiError(res: Response, fallback: string): Promise<Error> {
  const err = await res.json().catch(() => ({}));
  const title = typeof err.title === "string" ? err.title : fallback;
  return new Error(title);
}

export async function fetchBookChapters(slug: string): Promise<BookChapters> {
  const res = await authFetch(`/v1/reader/books/${slug}/chapters`);
  if (!res.ok) {
    throw await readerApiError(res, "Could not load chapters");
  }
  const json = await res.json();
  return json.data as BookChapters;
}

export async function fetchChapterContent(
  slug: string,
  chapterIndex: number
): Promise<ChapterContent> {
  const res = await authFetch(
    `/v1/reader/books/${slug}/chapters/${chapterIndex}/content`
  );
  if (!res.ok) {
    throw await readerApiError(res, "Could not load chapter");
  }
  const json = await res.json();
  return json.data as ChapterContent;
}

export async function fetchProgress(bookId: string): Promise<ReadingProgress | null> {
  const res = await authFetch(`/v1/reader/me/reading-sessions/${bookId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as ReadingProgress | null;
}

export async function saveProgress(
  bookId: string,
  payload: { chapter_id?: string; progress_offset: number }
) {
  await authFetch(`/v1/reader/me/reading-sessions/${bookId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchReaderPrefs(): Promise<ReaderPrefs> {
  const res = await authFetch("/v1/reader/me/reader-preferences");
  if (!res.ok) throw new Error("Could not load preferences");
  const json = await res.json();
  return json.data as ReaderPrefs;
}

export async function saveReaderPrefs(prefs: Partial<ReaderPrefs>) {
  await authFetch("/v1/reader/me/reader-preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
}
