import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Loading, ErrorBox } from "../components/Loading.js";
import { InProgress, QuizHistory } from "../lib/storage.js";
import { fmtDate, makeSessionId, shuffle } from "../lib/utils.js";
import type { QuizSession } from "../types.js";

export function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = sessionId ? QuizHistory.get(sessionId) : null;
    if (!s) {
      setError("Quiz session not found.");
    } else {
      setSession(s);
    }
  }, [sessionId]);

  function retryMissed() {
    if (!session) return;
    const missed = session.answers.filter((a) => !a.isCorrect).map((a) => a.questionId);
    if (!missed.length) return;
    const ids = shuffle(missed);
    const newId = makeSessionId();
    const retry: QuizSession = {
      sessionId: newId,
      startedAt: Date.now(),
      filters: {
        fixedIds: ids,
        label: `Retry missed from: ${session.filters.label ?? "quiz"}`,
      },
      questionIds: ids,
      answers: [],
      finished: false,
    };
    InProgress.save(retry);
    QuizHistory.push(retry);
    navigate(`/quiz/${newId}`);
  }

  if (error) return <ErrorBox error={error} />;
  if (!session) return <Loading label="Loading results…" />;

  const total = session.answers.length;
  const correct = session.answers.filter((a) => a.isCorrect).length;
  const wrong = total - correct;
  const skipped = session.questionIds.length - total;
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  const duration = session.endedAt
    ? Math.round((session.endedAt - session.startedAt) / 60_000)
    : null;

  const missed = session.answers.filter((a) => !a.isCorrect);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Results</h1>
        <p className="mt-1 text-sm text-ink-600">
          {session.filters.label ?? "Practice quiz"} · {fmtDate(session.startedAt)}
          {duration !== null && ` · ${duration} min`}
        </p>
      </header>

      {/* Score card */}
      <div className="grid gap-4 sm:grid-cols-4">
        <ScoreTile label="Score" value={`${pct}%`} sub={`${correct} / ${total} correct`}
          accent={pct >= 70 ? "green" : pct >= 50 ? "amber" : "rose"} />
        <ScoreTile label="Correct" value={String(correct)} sub="questions" accent="green" />
        <ScoreTile label="Wrong" value={String(wrong)} sub="questions" accent={wrong > 0 ? "rose" : "neutral"} />
        <ScoreTile label="Skipped" value={String(skipped)} sub="not reached" />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {missed.length > 0 && (
          <button
            type="button"
            onClick={retryMissed}
            className="rounded-md bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800"
          >
            Retry {missed.length} missed questions →
          </button>
        )}
        <Link
          to="/practice"
          className="rounded-md border border-ink-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
        >
          New quiz
        </Link>
        <Link
          to="/review"
          className="rounded-md border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
        >
          Open review queue
        </Link>
      </div>

      {/* Missed questions list */}
      {missed.length > 0 && (
        <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-600">
            Wrong answers ({missed.length})
          </h2>
          <ul className="grid gap-2 text-sm">
            {missed.map((a) => {
              const isAkash = a.questionId.startsWith("akash-");
              return (
                <li
                  key={a.questionId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2"
                >
                  <span className="font-mono text-xs text-ink-600">{a.questionId}</span>
                  <span className="text-xs text-ink-600">
                    You chose <strong>{a.chosen ?? "—"}</strong>, correct was <strong>{a.correct}</strong>
                  </span>
                  {isAkash ? (
                    <Link
                      to={`/mistakes/${a.questionId}`}
                      className="text-xs font-semibold text-indigo-700 underline underline-offset-2"
                    >
                      Review mistake →
                    </Link>
                  ) : (
                    <span className="text-xs text-ink-500">Added to spaced review</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {correct === total && total > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-lg font-bold text-emerald-800">Perfect score! 🎉</p>
          <p className="mt-1 text-sm text-emerald-700">All {total} questions correct.</p>
        </div>
      )}
    </div>
  );
}

interface TileProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "rose" | "amber" | "neutral";
}

function ScoreTile({ label, value, sub, accent = "neutral" }: TileProps) {
  const cls =
    accent === "green"
      ? "border-emerald-200 bg-emerald-50"
      : accent === "rose"
        ? "border-rose-200 bg-rose-50"
        : accent === "amber"
          ? "border-amber-200 bg-amber-50"
          : "border-ink-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cls}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-ink-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-600">{sub}</div>}
    </div>
  );
}
