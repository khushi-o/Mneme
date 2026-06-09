import { useCallback, useEffect, useRef, useState } from "react";
import { NavLabel } from "./NavLabel";
import {
  fetchBookChapters,
  fetchChapterContent,
  fetchProgress,
  fetchReaderPrefs,
  saveProgress,
  saveReaderPrefs,
  type ChapterMeta,
  type ReaderPrefs,
  type ReadingProgress,
} from "../lib/reader";

type Props = {
  slug: string;
  bookId: string;
  onClose: () => void;
};

function initialChapterIndex(
  chapters: ChapterMeta[],
  progress: ReadingProgress | null
): number {
  if (!progress?.chapter_id) return 1;
  const match = chapters.find((c) => c.id === progress.chapter_id);
  return match?.chapter_index ?? 1;
}

export function Reader({ slug, bookId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [html, setHtml] = useState("");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(1);
  const [totalChapters, setTotalChapters] = useState(1);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [prefs, setPrefs] = useState<ReaderPrefs>({
    font_size: 18,
    line_height: 1.6,
    margin_px: 48,
    theme: "sepia",
  });

  const contentRef = useRef<HTMLElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReadingProgress | null>(null);
  const pendingScrollRef = useRef<number | null>(null);

  const restoreScroll = useCallback((percent: number) => {
    const el = contentRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = max > 0 ? (percent / 100) * max : 0;
    setScrollPercent(percent);
  }, []);

  const flushProgress = useCallback(
    async (offset?: number) => {
      const el = contentRef.current;
      if (!el || !chapterId) return;

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }

      const max = el.scrollHeight - el.clientHeight;
      const percent =
        offset ?? (max > 0 ? Math.round((el.scrollTop / max) * 100) : 0);

      await saveProgress(bookId, {
        chapter_id: chapterId,
        progress_offset: percent,
      });
    },
    [bookId, chapterId]
  );

  const loadChapter = useCallback(
    async (index: number, restoreFromProgress: boolean): Promise<boolean> => {
      setChapterLoading(true);
      setError(null);

      try {
        const content = await fetchChapterContent(slug, index);
        setTitle(content.book_title);
        setChapterTitle(content.chapter_title);
        setHtml(content.html);
        setChapterId(content.chapter_id);
        setChapterIndex(content.chapter_index);

        const progress = progressRef.current;
        const shouldRestore =
          restoreFromProgress &&
          progress?.chapter_id === content.chapter_id &&
          progress.progress_offset != null;

        pendingScrollRef.current = shouldRestore
          ? Number(progress.progress_offset)
          : 0;

        setChapterLoading(false);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chapter");
        setChapterLoading(false);
        return false;
      }
    },
    [slug]
  );

  useEffect(() => {
    if (pendingScrollRef.current == null || chapterLoading) return;

    const percent = pendingScrollRef.current;
    pendingScrollRef.current = null;

    requestAnimationFrame(() => {
      restoreScroll(percent);
    });
  }, [html, chapterLoading, restoreScroll]);

  useEffect(() => {
    async function init() {
      try {
        const [chaptersPayload, progress, readerPrefs] = await Promise.all([
          fetchBookChapters(slug),
          fetchProgress(bookId),
          fetchReaderPrefs(),
        ]);

        progressRef.current = progress;
        setTitle(chaptersPayload.book_title);
        setTotalChapters(chaptersPayload.total);
        setPrefs(readerPrefs);

        const startIndex = initialChapterIndex(
          chaptersPayload.chapters,
          progress
        );
        const ok = await loadChapter(startIndex, true);
        setLoading(false);
        if (!ok) return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      }
    }
    init();
  }, [slug, bookId, loadChapter]);

  function scheduleSave() {
    const el = contentRef.current;
    if (!el || !chapterId) return;

    const max = el.scrollHeight - el.clientHeight;
    const percent = max > 0 ? Math.round((el.scrollTop / max) * 100) : 0;
    setScrollPercent(percent);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProgress(bookId, { chapter_id: chapterId, progress_offset: percent });
    }, 800);
  }

  async function goToChapter(nextIndex: number) {
    if (nextIndex < 1 || nextIndex > totalChapters || nextIndex === chapterIndex) {
      return;
    }
    await flushProgress();
    await loadChapter(nextIndex, false);
    contentRef.current?.scrollTo(0, 0);
    setScrollPercent(0);
  }

  async function updatePrefs(patch: Partial<ReaderPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await saveReaderPrefs(patch);
  }

  if (loading) {
    return (
      <div className="reader-shell">
        <p className="loading">Opening book…</p>
      </div>
    );
  }

  if (error && !html) {
    return (
      <div className="reader-shell">
        <button type="button" className="btn-ghost reader-back" onClick={onClose}>
          <NavLabel direction="left">Back</NavLabel>
        </button>
        <p className="auth-error">{error}</p>
        {import.meta.env.DEV && (
          <p className="auth-hint">
            Start Docker (<code>npm run docker:up</code>), then{" "}
            <code>npm run db:seed</code> and <code>npm run db:seed-content</code>.
            Restart the API if you just pulled new code.
          </p>
        )}
      </div>
    );
  }

  const hasPrev = chapterIndex > 1;
  const hasNext = chapterIndex < totalChapters;

  return (
    <div className={`reader-shell theme-${prefs.theme}`}>
      <div
        className="reader-progress-bar"
        role="progressbar"
        aria-valuenow={scrollPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress in chapter"
      >
        <div className="reader-progress-fill" style={{ width: `${scrollPercent}%` }} />
      </div>

      <header className="reader-toolbar">
        <div className="reader-chrome-inner reader-toolbar-row">
          <button type="button" className="btn-ghost btn-back" onClick={onClose}>
            <NavLabel direction="left">Library</NavLabel>
          </button>
          <div className="reader-title-block">
            <strong>{title}</strong>
            <span>
              Chapter {chapterIndex} of {totalChapters}
              {chapterTitle ? ` · ${chapterTitle}` : ""}
            </span>
          </div>
          <div className="reader-controls">
            <div className="reader-control-group reader-font-group">
              <button
                type="button"
                className="reader-icon-btn"
                aria-label="Smaller text"
                onClick={() => updatePrefs({ font_size: Math.max(14, prefs.font_size - 1) })}
              >
                A−
              </button>
              <span className="reader-font-size" aria-hidden="true">
                {prefs.font_size}px
              </span>
              <button
                type="button"
                className="reader-icon-btn"
                aria-label="Larger text"
                onClick={() => updatePrefs({ font_size: Math.min(28, prefs.font_size + 1) })}
              >
                A+
              </button>
            </div>
            <div className="reader-control-group reader-theme-group" role="group" aria-label="Reading theme">
              {(["light", "sepia", "dark"] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className={`reader-theme-swatch theme-swatch-${theme}${prefs.theme === theme ? " active" : ""}`}
                  aria-label={`${theme} theme`}
                  aria-pressed={prefs.theme === theme}
                  onClick={() => updatePrefs({ theme })}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="reader-body">
        {chapterLoading ? (
          <p className="loading reader-chapter-loading">Loading chapter…</p>
        ) : (
          <>
            {error && <p className="auth-error reader-inline-error">{error}</p>}
            <article
              ref={contentRef}
              className="reader-content"
              style={{
                fontSize: `${prefs.font_size}px`,
                lineHeight: prefs.line_height,
                paddingLeft: `${prefs.margin_px}px`,
                paddingRight: `${prefs.margin_px}px`,
              }}
              onScroll={scheduleSave}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </>
        )}
      </div>

      <footer className="reader-nav">
        <div className="reader-chrome-inner reader-nav-inner">
          <button
            type="button"
            className="btn-ghost"
            disabled={!hasPrev || chapterLoading}
            onClick={() => goToChapter(chapterIndex - 1)}
          >
            <NavLabel direction="left">Previous</NavLabel>
          </button>
          <span className="reader-nav-label">
            {chapterIndex} / {totalChapters}
          </span>
          <button
            type="button"
            className="btn-ghost"
            disabled={!hasNext || chapterLoading}
            onClick={() => goToChapter(chapterIndex + 1)}
          >
            <NavLabel direction="right">Next</NavLabel>
          </button>
        </div>
      </footer>
    </div>
  );
}
