import { useRef, useState } from "react";

import { clearAllProgress, exportProgress, importProgress, useStored } from "../lib/storage.js";
import type { QuizSession, SRItem } from "../types.js";

export function Settings() {
  const [quizHistory] = useStored<QuizSession[]>("quiz-history", []);
  const [srState] = useStored<SRItem[]>("sr-state", []);
  const [bookmarks] = useStored<string[]>("bookmarks", []);
  const [seenPyqs] = useStored<string[]>("seen-pyqs", []);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importOk, setImportOk] = useState(false);
  const [cleared, setCleared] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = exportProgress();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neet-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErr(null);
    setImportOk(false);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importProgress(reader.result as string);
        setImportOk(true);
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        setImportErr(String(err));
      }
    };
    reader.readAsText(file);
  }

  function handleClear() {
    if (!window.confirm("This will permanently delete all quiz history, bookmarks, and spaced-review data. Are you sure?")) return;
    clearAllProgress();
    setCleared(true);
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-600">Manage your progress data and preferences.</p>
      </header>

      {/* Storage stats */}
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-600">Your data</h2>
        <ul className="grid gap-2 text-sm">
          <StatRow label="Quiz sessions" value={quizHistory.length} />
          <StatRow label="Spaced-review items" value={srState.length} />
          <StatRow label="Bookmarks" value={bookmarks.length} />
          <StatRow label="Seen PYQs" value={seenPyqs.length} />
        </ul>
      </section>

      {/* Export */}
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-600">Export progress</h2>
        <p className="mb-3 text-sm text-ink-600">
          Download all your progress as a JSON file. Import it on another device or after clearing your browser data.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
        >
          Export progress.json
        </button>
      </section>

      {/* Import */}
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-600">Import progress</h2>
        <p className="mb-3 text-sm text-ink-600">
          Select a previously exported JSON file. Your existing data will be merged/overwritten with the file's contents.
          The page will reload automatically.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
        >
          Import from file…
        </button>
        {importOk && <p className="mt-2 text-sm font-semibold text-emerald-700">Import successful! Reloading…</p>}
        {importErr && <p className="mt-2 text-sm text-rose-700">{importErr}</p>}
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-rose-700">Danger zone</h2>
        <p className="mb-3 text-sm text-rose-800">
          Permanently delete all quiz history, spaced-review data, bookmarks, and seen-question records.
          The question data itself (Akash analysis and PYQs) is not affected.
        </p>
        {cleared ? (
          <p className="text-sm font-semibold text-rose-700">All progress cleared.</p>
        ) : (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-rose-400 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Clear all progress
          </button>
        )}
      </section>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between rounded-md border border-ink-100 bg-ink-50/50 px-3 py-2">
      <span className="text-ink-700">{label}</span>
      <span className="font-semibold text-ink-900">{value.toLocaleString()}</span>
    </li>
  );
}
