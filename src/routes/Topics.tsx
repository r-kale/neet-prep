import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Loading, ErrorBox } from "../components/Loading.js";
import { useEagerData } from "../lib/data.js";
import { pct, slugifyTopic, subjectColor } from "../lib/utils.js";
import type { Subject } from "../types.js";

export function Topics() {
  const { data, error } = useEagerData();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"mistakes" | "name" | "accuracy">("mistakes");

  const topics = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, {
      subject: Subject;
      topic: string;
      total: number;
      correct: number;
      incorrect: number;
      not_attempted: number;
    }>();

    for (const q of data.akash) {
      const key = `${q.subject}::${q.topic}`;
      const existing = map.get(key) ?? {
        subject: q.subject,
        topic: q.topic,
        total: 0,
        correct: 0,
        incorrect: 0,
        not_attempted: 0,
      };
      existing.total++;
      if (q.result === "Correct") existing.correct++;
      else if (q.result === "Incorrect") existing.incorrect++;
      else existing.not_attempted++;
      map.set(key, existing);
    }

    let list = Array.from(map.values());

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((t) => t.topic.toLowerCase().includes(s) || t.subject.toLowerCase().includes(s));
    }

    list.sort((a, b) => {
      if (sortBy === "mistakes") return (b.incorrect + b.not_attempted) - (a.incorrect + a.not_attempted);
      if (sortBy === "accuracy") {
        const pa = a.total ? a.correct / a.total : 1;
        const pb = b.total ? b.correct / b.total : 1;
        return pa - pb; // worst first
      }
      return a.topic.localeCompare(b.topic);
    });

    return list;
  }, [data, search, sortBy]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading label="Loading topics…" />;

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
        <p className="mt-1 text-sm text-ink-600">
          {topics.length} topics from your {data.akash.length} Akash questions. Click a topic to see details and practice similar PYQs.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search topic…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-400 focus:outline-none"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-800 focus:border-ink-400 focus:outline-none"
        >
          <option value="mistakes">Sort: most mistakes</option>
          <option value="accuracy">Sort: worst accuracy</option>
          <option value="name">Sort: A–Z</option>
        </select>
      </div>

      <ul className="grid gap-2">
        {topics.map((t) => {
          const mistakes = t.incorrect + t.not_attempted;
          const accuracy = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 100;
          const barWidth = accuracy;
          const barColor =
            accuracy >= 70 ? "bg-emerald-400" : accuracy >= 50 ? "bg-amber-400" : "bg-rose-400";

          return (
            <li key={`${t.subject}::${t.topic}`}>
              <Link
                to={`/topics/${slugifyTopic(t.subject, t.topic)}`}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/30"
              >
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${subjectColor[t.subject]}`}>
                  {t.subject}
                </span>
                <span className="flex-1 text-sm font-medium text-ink-900">{t.topic}</span>
                <div className="flex items-center gap-3">
                  <div className="hidden w-24 sm:block">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs font-bold text-ink-700">{pct(t.correct, t.total)}</span>
                  {mistakes > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                      {mistakes} mistake{mistakes === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {topics.length === 0 && (
        <p className="py-12 text-center text-sm text-ink-500">No topics match your search.</p>
      )}
    </div>
  );
}
