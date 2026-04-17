import { useEffect } from "react";
import { Link } from "react-router-dom";

import { Loading, ErrorBox } from "../components/Loading.js";
import { SimpleBar, StackedResultBar } from "../components/StatChart.js";
import { useEagerData } from "../lib/data.js";
import { dueCount, seedFromAkashMistakes } from "../lib/sr.js";
import { useStored } from "../lib/storage.js";
import { fmtRelative, pct, slugifyTopic, subjectColor } from "../lib/utils.js";
import type { QuizSession } from "../types.js";

export function Dashboard() {
  const { data, error } = useEagerData();
  const [history] = useStored<QuizSession[]>("quiz-history", []);

  // First time we have Akash data, seed the SR queue with all Incorrect mistakes.
  useEffect(() => {
    if (!data) return;
    const mistakeIds = data.akash
      .filter((q) => q.result === "Incorrect" || q.result === "Not Attempted")
      .map((q) => q.id);
    seedFromAkashMistakes(mistakeIds);
  }, [data]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading label="Loading practice analysis…" />;

  const { stats } = data;
  const a = stats.akash;
  const due = dueCount();

  const subjectChartData = a.bySubject.map((s) => ({
    label: s.subject,
    Correct: s.correct,
    Incorrect: s.incorrect,
    "Not Attempted": s.not_attempted,
  }));

  const difficultyChartData = a.byDifficulty.map((d) => ({
    label: d.difficulty,
    Correct: d.correct,
    Incorrect: d.incorrect,
  }));

  const weakTopics = a.topWeakTopics.slice(0, 10).map((t) => ({
    label: `${t.topic}  (${t.subject})`,
    value: t.mistakes,
    highlight: t.mistakes / Math.max(1, t.total) >= 0.5,
  }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your performance</h1>
        <p className="mt-1 text-sm text-ink-600">
          Across {a.total} graded Akash questions in {a.byPaper.length} paper{a.byPaper.length === 1 ? "" : "s"}.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Overall accuracy" value={pct(a.correct, a.total)} sub={`${a.correct} of ${a.total} correct`} />
        <StatTile label="Mistakes to review" value={String(a.incorrect + a.not_attempted)} sub={`${a.incorrect} wrong · ${a.not_attempted} skipped`} accent="rose" />
        <StatTile
          label="Due in spaced review"
          value={String(due)}
          sub={due === 0 ? "All caught up" : "Open the Review tab"}
          accent={due > 0 ? "amber" : "neutral"}
        />
        <StatTile label="PYQ pool available" value={stats.pyq.total.toLocaleString()} sub={`${stats.pyq.inSyllabus2026.toLocaleString()} in 2026 syllabus`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Performance by subject">
          <StackedResultBar data={subjectChartData} />
        </Panel>
        <Panel title="Performance by difficulty">
          <StackedResultBar data={difficultyChartData} />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Top weak topics" className="lg:col-span-2">
          {weakTopics.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-500">No mistakes — incredible.</p>
          ) : (
            <SimpleBar data={weakTopics} />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {a.topWeakTopics.slice(0, 6).map((t) => (
              <Link
                key={`${t.subject}::${t.topic}`}
                to={`/topics/${slugifyTopic(t.subject, t.topic)}`}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${subjectColor[t.subject]}`}
              >
                {t.topic} <span className="opacity-60">· {t.mistakes}/{t.total}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Per-paper score">
          <ul className="grid gap-2 text-sm">
            {a.byPaper.map((p) => (
              <li key={p.paper} className="flex items-center justify-between rounded-md border border-ink-100 bg-ink-50/50 px-3 py-2">
                <span className="font-mono text-xs uppercase text-ink-700">{p.paper}</span>
                <span className="font-semibold">
                  {p.correct} / {p.total} <span className="text-ink-400">({pct(p.correct, p.total)})</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <Panel title="Recent quizzes">
        {history.length === 0 ? (
          <p className="py-6 text-sm text-ink-500">
            No quizzes yet. <Link to="/practice" className="font-semibold text-indigo-700 underline">Start one</Link>.
          </p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {history.slice(0, 5).map((s) => (
              <li key={s.sessionId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink-100 bg-ink-50/50 px-3 py-2">
                <Link to={`/results/${s.sessionId}`} className="font-medium text-ink-900 hover:underline">
                  {s.filters.label ?? "Practice quiz"}
                </Link>
                <span className="text-xs text-ink-500">{fmtRelative(s.startedAt)}</span>
                <span className="text-xs font-semibold">
                  {s.answers.filter((a) => a.isCorrect).length} / {s.questionIds.length} correct
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function Panel({ title, children, className }: PanelProps) {
  return (
    <section className={`rounded-xl border border-ink-200 bg-white p-4 shadow-sm ${className ?? ""}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

interface TileProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "neutral" | "rose" | "amber";
}

function StatTile({ label, value, sub, accent = "neutral" }: TileProps) {
  const accentCls =
    accent === "rose"
      ? "border-rose-200 bg-rose-50"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50"
        : "border-ink-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${accentCls}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-ink-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-600">{sub}</div>}
    </div>
  );
}
