/**
 * Data loaders. Akash + stats + topic-index are eager-loaded on app boot
 * (small, used everywhere). PYQs are lazy-loaded the first time a route asks.
 */
import { useEffect, useState } from "react";

import type {
  AkashQuestion,
  AkashStats,
  AnyQuestion,
  PyqQuestion,
  PyqStats,
  TopicIndex,
} from "../types.js";

type StatsFile = {
  akash: AkashStats;
  pyq: PyqStats;
  generatedAt: string;
};

const dataUrl = (name: string): string => `${import.meta.env.BASE_URL}data/${name}`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return (await res.json()) as T;
}

// ───────── eager singletons ─────────

let eagerPromise: Promise<{
  akash: AkashQuestion[];
  akashById: Map<string, AkashQuestion>;
  topicIndex: TopicIndex;
  stats: StatsFile;
}> | null = null;

export function loadEager() {
  if (!eagerPromise) {
    eagerPromise = (async () => {
      const [akash, topicIndex, stats] = await Promise.all([
        fetchJson<AkashQuestion[]>(dataUrl("akash.json")),
        fetchJson<TopicIndex>(dataUrl("topic-index.json")),
        fetchJson<StatsFile>(dataUrl("stats.json")),
      ]);
      const akashById = new Map(akash.map((q) => [q.id, q]));
      return { akash, akashById, topicIndex, stats };
    })();
  }
  return eagerPromise;
}

export function useEagerData() {
  const [state, setState] = useState<Awaited<ReturnType<typeof loadEager>> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadEager()
      .then((d) => {
        if (!cancelled) setState(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { data: state, error };
}

// ───────── lazy PYQ ─────────

let pyqPromise: Promise<{ pyq: PyqQuestion[]; pyqById: Map<string, PyqQuestion> }> | null = null;

export function loadPyq() {
  if (!pyqPromise) {
    pyqPromise = (async () => {
      const pyq = await fetchJson<PyqQuestion[]>(dataUrl("pyq.json"));
      const pyqById = new Map(pyq.map((q) => [q.id, q]));
      return { pyq, pyqById };
    })();
  }
  return pyqPromise;
}

export function usePyq() {
  const [state, setState] = useState<Awaited<ReturnType<typeof loadPyq>> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadPyq()
      .then((d) => {
        if (!cancelled) setState(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { data: state, error };
}

/** Find a question by ID across both sources (PYQ may not be loaded yet). */
export async function findQuestion(id: string): Promise<AnyQuestion | null> {
  const eager = await loadEager();
  const akash = eager.akashById.get(id);
  if (akash) return akash;
  if (id.startsWith("pyq-")) {
    const { pyqById } = await loadPyq();
    return pyqById.get(id) ?? null;
  }
  return null;
}
