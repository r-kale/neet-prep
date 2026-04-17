import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BookmarkButton } from "../components/BookmarkButton.js";
import { Loading } from "../components/Loading.js";
import { QuestionCard } from "../components/QuestionCard.js";
import { findQuestion } from "../lib/data.js";
import { useStored } from "../lib/storage.js";
import type { AnyQuestion } from "../types.js";

export function Bookmarks() {
  const [bookmarks] = useStored<string[]>("bookmarks", []);
  const [questions, setQuestions] = useState<Map<string, AnyQuestion>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookmarks.length) return;
    setLoading(true);
    Promise.all(bookmarks.map((id) => findQuestion(id)))
      .then((results) => {
        const m = new Map<string, AnyQuestion>();
        results.forEach((q, i) => {
          if (q) m.set(bookmarks[i], q);
        });
        setQuestions(m);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookmarks.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (bookmarks.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">Bookmarks</h1>
        <p className="text-sm text-ink-500">
          No bookmarks yet. Click the bookmark button on any question to save it here.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link to="/mistakes" className="text-sm font-semibold text-indigo-700 underline">Browse mistakes</Link>
          <Link to="/practice" className="text-sm font-semibold text-indigo-700 underline">Start a quiz</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
        <p className="mt-1 text-sm text-ink-600">{bookmarks.length} saved question{bookmarks.length === 1 ? "" : "s"}</p>
      </header>

      {loading && <Loading label="Loading bookmarked questions…" />}

      <ul className="grid gap-4">
        {bookmarks.map((id) => {
          const q = questions.get(id);
          if (!q) return null;
          const linkTo = q.source === "akash" ? `/mistakes/${id}` : null;
          return (
            <li key={id}>
              <QuestionCard
                question={q}
                trailing={
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <BookmarkButton id={id} />
                    {linkTo && (
                      <Link
                        to={linkTo}
                        className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
                      >
                        Review →
                      </Link>
                    )}
                  </div>
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
