import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Loading } from "../components/Loading.js";
import { findQuestion, loadEager, loadPyq } from "../lib/data.js";
import { dueNow, markMastered, recordReviewFailure, recordReviewSuccess } from "../lib/sr.js";
import { InProgress, QuizHistory, useStored } from "../lib/storage.js";
import { fmtRelative, makeSessionId } from "../lib/utils.js";
import type { AnyQuestion, QuizSession, SRItem } from "../types.js";

export function Review() {
  const navigate = useNavigate();
  const [srState] = useStored<SRItem[]>("sr-state", []);
  const [questions, setQuestions] = useState<Map<string, AnyQuestion>>(new Map());
  const [loading, setLoading] = useState(false);

  const dueItems = useMemo(() => dueNow(), [srState]);

  useEffect(() => {
    if (!dueItems.length) return;
    setLoading(true);
    Promise.all([loadEager(), loadPyq()])
      .then(() => Promise.all(dueItems.map((item) => findQuestion(item.id))))
      .then((results) => {
        const m = new Map<string, AnyQuestion>();
        results.forEach((q, i) => {
          if (q) m.set(dueItems[i].id, q);
        });
        setQuestions(m);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dueItems.map((d) => d.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  function startReviewQuiz() {
    const ids = dueItems.map((s) => s.id);
    if (!ids.length) return;
    const sessionId = makeSessionId();
    const session: QuizSession = {
      sessionId,
      startedAt: Date.now(),
      filters: {
        fixedIds: ids,
        label: `Spaced review — ${ids.length} due`,
      },
      questionIds: ids,
      answers: [],
      finished: false,
    };
    InProgress.save(session);
    QuizHistory.push(session);
    navigate(`/quiz/${sessionId}`);
  }

  // Upcoming reviews (due in future)
  const upcomingItems = srState
    .filter((s) => s.due > Date.now())
    .sort((a, b) => a.due - b.due)
    .slice(0, 10);

  if (srState.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">Spaced Review</h1>
        <p className="text-sm text-ink-500">
          No questions in your review queue yet.
          <br />
          Wrong answers from practice quizzes and Akash mistakes are added automatically.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link to="/mistakes" className="text-sm font-semibold text-indigo-700 underline">See Akash mistakes</Link>
          <Link to="/practice" className="text-sm font-semibold text-indigo-700 underline">Start a quiz</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Spaced Review</h1>
          <p className="mt-1 text-sm text-ink-600">
            {dueItems.length > 0
              ? `${dueItems.length} question${dueItems.length === 1 ? "" : "s"} due today`
              : "All caught up! No reviews due today."}
          </p>
        </div>
        {dueItems.length > 0 && (
          <button
            type="button"
            onClick={startReviewQuiz}
            className="rounded-md bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800"
          >
            Review all {dueItems.length} now →
          </button>
        )}
      </header>

      {/* Due now */}
      {dueItems.length > 0 && (
        <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-600">Due now</h2>
          {loading && <Loading label="Loading questions…" />}
          <ul className="grid gap-2">
            {dueItems.map((item) => {
              const q = questions.get(item.id);
              const isAkash = item.id.startsWith("akash-");
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                  <span className={`rounded-full border px-2 py-0.5 font-semibold ${
                    item.source === "akash"
                      ? "border-indigo-200 bg-indigo-100 text-indigo-800"
                      : "border-emerald-200 bg-emerald-100 text-emerald-800"
                  }`}>
                    {item.source === "akash" ? "Akash" : "PYQ"}
                  </span>
                  {q && (
                    <span className="flex-1 truncate text-ink-700">
                      {q.source === "akash"
                        ? `${q.topic} · ${q.sub_topic}`
                        : q.topic_tag}
                    </span>
                  )}
                  <span className="text-ink-500">{item.misses} miss{item.misses === 1 ? "" : "es"}</span>
                  {isAkash && (
                    <Link
                      to={`/mistakes/${item.id}`}
                      className="font-semibold text-indigo-700 underline underline-offset-2"
                    >
                      Review →
                    </Link>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => recordReviewSuccess(item.id)}
                      className="rounded border border-emerald-300 bg-white px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Got it
                    </button>
                    <button
                      type="button"
                      onClick={() => recordReviewFailure(item.id)}
                      className="rounded border border-rose-300 bg-white px-2 py-0.5 font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Confused
                    </button>
                    <button
                      type="button"
                      onClick={() => markMastered(item.id)}
                      className="rounded border border-ink-200 bg-white px-2 py-0.5 text-ink-600 hover:bg-ink-50"
                    >
                      Mastered
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Upcoming */}
      {upcomingItems.length > 0 && (
        <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-600">Coming up next</h2>
          <ul className="grid gap-2">
            {upcomingItems.map((item) => {
              const q = questions.get(item.id);
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs text-ink-600">
                  <span className="font-medium">{q?.source === "akash" ? (q.topic ?? item.id) : (q?.topic_tag ?? item.id)}</span>
                  <span className="ml-auto">{fmtRelative(item.due)}</span>
                </li>
              );
            })}
          </ul>
          {srState.filter((s) => s.due > Date.now()).length > 10 && (
            <p className="mt-2 text-xs text-ink-500">
              +{srState.filter((s) => s.due > Date.now()).length - 10} more scheduled
            </p>
          )}
        </section>
      )}

      {/* All caught up */}
      {dueItems.length === 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-lg font-bold text-emerald-800">All caught up! ✓</p>
          <p className="mt-1 text-sm text-emerald-700">
            {upcomingItems.length > 0
              ? `Next review: ${fmtRelative(upcomingItems[0].due)}`
              : "No upcoming reviews scheduled."}
          </p>
        </div>
      )}
    </div>
  );
}
