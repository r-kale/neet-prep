import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DifficultyChips, SubjectChips } from "../components/FilterBar.js";
import { Loading, ErrorBox } from "../components/Loading.js";
import { useEagerData } from "../lib/data.js";
import { difficultyColor, subjectColor, SUBJECTS } from "../lib/utils.js";
import type { AkashQuestion, Difficulty, Subject } from "../types.js";

type ResultFilter = "All" | "Incorrect" | "Not Attempted";

export function Mistakes() {
  const { data, error } = useEagerData();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("All");
  const [paperFilter, setPaperFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  const questions = useMemo(() => {
    if (!data) return [];
    return data.akash.filter((q) => {
      if (q.result === "Correct") return false;
      if (resultFilter !== "All" && q.result !== resultFilter) return false;
      if (subjects.length && !subjects.includes(q.subject)) return false;
      if (difficulties.length && !difficulties.includes(q.difficulty)) return false;
      if (paperFilter !== "All" && q.paper !== paperFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!q.topic.toLowerCase().includes(s) && !q.sub_topic.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [data, subjects, difficulties, resultFilter, paperFilter, search]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading label="Loading mistakes…" />;

  const papers = Array.from(new Set(data.akash.map((q) => q.paper))).sort();
  const total = data.akash.filter((q) => q.result !== "Correct").length;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mistakes & skipped questions</h1>
          <p className="mt-1 text-sm text-ink-600">
            {questions.length} of {total} shown · click any question to review it
          </p>
        </div>
        <Link to="/review" className="text-sm font-semibold text-indigo-700 underline underline-offset-2">
          Spaced-review queue →
        </Link>
      </header>

      {/* Filters */}
      <section className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-700">Subject</p>
            <SubjectChips subjects={SUBJECTS} selected={subjects} onChange={setSubjects} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-700">Difficulty</p>
            <DifficultyChips selected={difficulties} onChange={setDifficulties} />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink-700">Status</p>
              <div className="flex gap-1.5">
                {(["All", "Incorrect", "Not Attempted"] as ResultFilter[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResultFilter(r)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
                      resultFilter === r
                        ? "border-ink-900 bg-ink-900 text-white"
                        : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink-700">Paper</p>
              <select
                value={paperFilter}
                onChange={(e) => setPaperFilter(e.target.value)}
                className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs text-ink-800 focus:border-ink-400 focus:outline-none"
              >
                <option value="All">All papers</option>
                {papers.map((p) => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <input
            type="search"
            placeholder="Search by topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-400 focus:outline-none"
          />
        </div>
      </section>

      {/* List */}
      {questions.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-500">No questions match these filters.</p>
      ) : (
        <ul className="grid gap-2">
          {questions.map((q) => (
            <MistakeRow key={q.id} question={q} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MistakeRow({ question: q }: { question: AkashQuestion }) {
  const resultCls =
    q.result === "Incorrect"
      ? "border-rose-300 bg-rose-50 text-rose-800"
      : "border-amber-300 bg-amber-50 text-amber-800";

  return (
    <li>
      <Link
        to={`/mistakes/${q.id}`}
        className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/30"
      >
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${subjectColor[q.subject]}`}>
          {q.subject}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${difficultyColor[q.difficulty]}`}>
          {q.difficulty}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${resultCls}`}>
          {q.result}
        </span>
        <span className="font-mono text-xs text-ink-500">{q.paper.toUpperCase()} · Q{q.q_no}</span>
        <span className="flex-1 text-xs text-ink-700">{q.topic} · {q.sub_topic}</span>
        <span className="shrink-0 text-xs text-ink-400">Review →</span>
      </Link>
    </li>
  );
}
