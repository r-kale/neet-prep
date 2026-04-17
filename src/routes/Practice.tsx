import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DifficultyChips, Field, SubjectChips } from "../components/FilterBar.js";
import { Loading, ErrorBox } from "../components/Loading.js";
import { usePyq } from "../lib/data.js";
import { InProgress, QuizHistory, SeenPyqs } from "../lib/storage.js";
import { makeSessionId, shuffle, SUBJECTS } from "../lib/utils.js";
import type { Difficulty, QuizFilters, QuizSession, Subject } from "../types.js";

export function Practice() {
  const { data: pyqData, error } = usePyq();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [yearMin, setYearMin] = useState(2016);
  const [yearMax, setYearMax] = useState(2025);
  const [syllabusOnly, setSyllabusOnly] = useState(true);
  const [excludeSeen, setExcludeSeen] = useState(true);
  const [topicQuery, setTopicQuery] = useState("");
  const [count, setCount] = useState(20);

  const available = useMemo(() => {
    if (!pyqData) return 0;
    const seen = new Set(SeenPyqs.list());
    return pyqData.pyq.filter((q) => {
      if (subjects.length && !subjects.includes(q.subject)) return false;
      if (difficulties.length && !difficulties.includes(q.difficulty)) return false;
      if (q.year < yearMin || q.year > yearMax) return false;
      if (syllabusOnly && !q.in_2026_syllabus) return false;
      if (excludeSeen && seen.has(q.id)) return false;
      if (topicQuery) {
        const tq = topicQuery.toLowerCase();
        if (!q.topic_tag.toLowerCase().includes(tq)) return false;
      }
      return true;
    }).length;
  }, [pyqData, subjects, difficulties, yearMin, yearMax, syllabusOnly, excludeSeen, topicQuery]);

  function startQuiz() {
    if (!pyqData) return;
    const seen = new Set(SeenPyqs.list());

    let pool = pyqData.pyq.filter((q) => {
      if (subjects.length && !subjects.includes(q.subject)) return false;
      if (difficulties.length && !difficulties.includes(q.difficulty)) return false;
      if (q.year < yearMin || q.year > yearMax) return false;
      if (syllabusOnly && !q.in_2026_syllabus) return false;
      if (excludeSeen && seen.has(q.id)) return false;
      if (topicQuery) {
        const tq = topicQuery.toLowerCase();
        if (!q.topic_tag.toLowerCase().includes(tq)) return false;
      }
      return true;
    });

    pool = shuffle(pool);
    const selected = pool.slice(0, count);
    if (!selected.length) return;

    const labelParts: string[] = [];
    if (subjects.length) labelParts.push(subjects.join(", "));
    else labelParts.push("All subjects");
    if (difficulties.length) labelParts.push(difficulties.join(", "));
    if (topicQuery) labelParts.push(`"${topicQuery}"`);
    labelParts.push(`${yearMin}–${yearMax}`);

    const filters: QuizFilters = {
      subjects: subjects.length ? subjects : undefined,
      difficulties: difficulties.length ? difficulties : undefined,
      yearMin,
      yearMax,
      inSyllabus2026Only: syllabusOnly,
      excludeSeen,
      topicQuery: topicQuery || undefined,
      count,
      label: labelParts.join(" · "),
    };

    const sessionId = makeSessionId();
    const session: QuizSession = {
      sessionId,
      startedAt: Date.now(),
      filters,
      questionIds: selected.map((q) => q.id),
      answers: [],
      finished: false,
    };
    InProgress.save(session);
    QuizHistory.push(session);
    navigate(`/quiz/${sessionId}`);
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Practice with PYQs</h1>
        <p className="mt-1 text-sm text-ink-600">Configure a quiz from {pyqData ? pyqData.pyq.length.toLocaleString() : "…"} NEET past-year questions.</p>
      </header>

      <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Subject">
            <SubjectChips subjects={SUBJECTS} selected={subjects} onChange={setSubjects} />
            <span className="text-[11px] text-ink-500">Leave blank for all subjects</span>
          </Field>

          <Field label="Difficulty">
            <DifficultyChips selected={difficulties} onChange={setDifficulties} />
            <span className="text-[11px] text-ink-500">Leave blank for all difficulties</span>
          </Field>

          <Field label={`Year range: ${yearMin} – ${yearMax}`}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2006}
                max={yearMax}
                value={yearMin}
                onChange={(e) => setYearMin(Number(e.target.value))}
                className="w-20 rounded-md border border-ink-200 px-2 py-1 text-sm text-ink-800 focus:border-ink-400 focus:outline-none"
              />
              <span className="text-ink-400">to</span>
              <input
                type="number"
                min={yearMin}
                max={2025}
                value={yearMax}
                onChange={(e) => setYearMax(Number(e.target.value))}
                className="w-20 rounded-md border border-ink-200 px-2 py-1 text-sm text-ink-800 focus:border-ink-400 focus:outline-none"
              />
            </div>
          </Field>

          <Field label="Topic keyword (optional)">
            <input
              type="search"
              placeholder="e.g. Electrochemistry"
              value={topicQuery}
              onChange={(e) => setTopicQuery(e.target.value)}
              className="rounded-md border border-ink-200 px-2.5 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-400 focus:outline-none"
            />
            <span className="text-[11px] text-ink-500">Filters by topic tag</span>
          </Field>

          <Field label={`Number of questions: ${count}`}>
            <input
              type="range"
              min={5}
              max={180}
              step={5}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] text-ink-400">
              <span>5</span>
              <span>45</span>
              <span>90</span>
              <span>180</span>
            </div>
          </Field>

          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm font-medium text-ink-800">
              <input
                type="checkbox"
                checked={syllabusOnly}
                onChange={(e) => setSyllabusOnly(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              2026 syllabus questions only
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-800">
              <input
                type="checkbox"
                checked={excludeSeen}
                onChange={(e) => setExcludeSeen(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              Exclude already-seen questions
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          {error ? (
            <ErrorBox error={error} />
          ) : !pyqData ? (
            <Loading label="Loading question pool…" />
          ) : (
            <>
              <p className="text-sm text-ink-600">
                <strong className="text-ink-900">{available.toLocaleString()}</strong> questions match your filters
              </p>
              <button
                type="button"
                disabled={available === 0}
                onClick={startQuiz}
                className="rounded-md bg-indigo-700 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start quiz ({Math.min(count, available)} questions) →
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-600">Tips</h2>
        <ul className="grid gap-1.5 text-sm text-ink-700">
          <li>• <strong>2026 syllabus filter</strong> is on by default — focuses only on chapters relevant to your exam.</li>
          <li>• Enable <strong>exclude seen</strong> to always encounter fresh questions.</li>
          <li>• Wrong answers from practice quizzes are added to your <strong>Spaced Review</strong> queue automatically.</li>
          <li>• Open <strong>Mistakes</strong> to find similar PYQs for a specific topic you struggled with.</li>
        </ul>
      </div>
    </div>
  );
}
