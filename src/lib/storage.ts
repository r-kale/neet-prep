/**
 * Versioned localStorage wrappers + tiny pub/sub for cross-component reactivity.
 * Bump KEY_PREFIX if you change shapes.
 */
import { useEffect, useState } from "react";

import type { QuizSession, SRItem, WrongPyqRecord } from "../types.js";

const KEY_PREFIX = "v1:";
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function emit(key: string): void {
  const fns = listeners.get(key);
  if (fns) for (const fn of fns) fn();
}

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  emit(key);
}

function subscribe(key: string, fn: Listener): () => void {
  let bucket = listeners.get(key);
  if (!bucket) {
    bucket = new Set();
    listeners.set(key, bucket);
  }
  bucket.add(fn);
  return () => bucket!.delete(fn);
}

/** Subscribe a React component to a localStorage key. */
export function useStored<T>(key: string, fallback: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => get(key, fallback));
  useEffect(() => {
    const update = () => setValue(get(key, fallback));
    update();
    return subscribe(key, update);
  }, [key]); // fallback intentionally omitted — reading once on mount is enough
  return [value, (next: T) => set(key, next)];
}

// ───────── Quiz history ─────────

export const QuizHistory = {
  list(): QuizSession[] {
    return get<QuizSession[]>("quiz-history", []);
  },
  push(session: QuizSession): void {
    const all = QuizHistory.list();
    const idx = all.findIndex((s) => s.sessionId === session.sessionId);
    if (idx >= 0) all[idx] = session;
    else all.unshift(session);
    set("quiz-history", all.slice(0, 200));
  },
  get(sessionId: string): QuizSession | null {
    return QuizHistory.list().find((s) => s.sessionId === sessionId) ?? null;
  },
  clear(): void {
    set("quiz-history", []);
  },
};

// ───────── In-progress quiz (for crash recovery) ─────────

export const InProgress = {
  get(): QuizSession | null {
    return get<QuizSession | null>("in-progress-quiz", null);
  },
  save(session: QuizSession | null): void {
    set("in-progress-quiz", session);
  },
  clear(): void {
    set("in-progress-quiz", null);
  },
};

// ───────── Bookmarks ─────────

export const Bookmarks = {
  list(): string[] {
    return get<string[]>("bookmarks", []);
  },
  has(id: string): boolean {
    return Bookmarks.list().includes(id);
  },
  toggle(id: string): boolean {
    const current = Bookmarks.list();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    set("bookmarks", next);
    return next.includes(id);
  },
};

// ───────── Seen / wrong PYQs ─────────

export const SeenPyqs = {
  list(): string[] {
    return get<string[]>("seen-pyqs", []);
  },
  add(ids: string[]): void {
    if (!ids.length) return;
    const merged = Array.from(new Set([...SeenPyqs.list(), ...ids]));
    set("seen-pyqs", merged);
  },
};

export const WrongPyqs = {
  list(): WrongPyqRecord[] {
    return get<WrongPyqRecord[]>("wrong-pyqs", []);
  },
  record(id: string): void {
    const all = WrongPyqs.list();
    const existing = all.find((w) => w.id === id);
    if (existing) {
      existing.attempts += 1;
      existing.lastWrongAt = Date.now();
    } else {
      all.push({ id, attempts: 1, lastWrongAt: Date.now() });
    }
    set("wrong-pyqs", all);
  },
};

// ───────── Mastered + SR queue ─────────

export const Mastered = {
  list(): string[] {
    return get<string[]>("mastered", []);
  },
  add(id: string): void {
    const next = Array.from(new Set([...Mastered.list(), id]));
    set("mastered", next);
  },
  remove(id: string): void {
    set("mastered", Mastered.list().filter((x) => x !== id));
  },
  has(id: string): boolean {
    return Mastered.list().includes(id);
  },
};

export const SR = {
  list(): SRItem[] {
    return get<SRItem[]>("sr-state", []);
  },
  upsert(item: SRItem): void {
    const all = SR.list();
    const idx = all.findIndex((s) => s.id === item.id);
    if (idx >= 0) all[idx] = item;
    else all.push(item);
    set("sr-state", all);
  },
  remove(id: string): void {
    set("sr-state", SR.list().filter((s) => s.id !== id));
  },
};

// ───────── Export / import ─────────

const ALL_KEYS = [
  "quiz-history",
  "in-progress-quiz",
  "bookmarks",
  "seen-pyqs",
  "wrong-pyqs",
  "mastered",
  "sr-state",
] as const;

export function exportProgress(): string {
  const dump: Record<string, unknown> = { __version: 1, exportedAt: new Date().toISOString() };
  for (const k of ALL_KEYS) dump[k] = get(k, null);
  return JSON.stringify(dump, null, 2);
}

export function importProgress(json: string): void {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  for (const k of ALL_KEYS) {
    if (k in parsed) set(k, parsed[k]);
  }
}

export function clearAllProgress(): void {
  for (const k of ALL_KEYS) localStorage.removeItem(KEY_PREFIX + k);
  for (const k of ALL_KEYS) emit(k);
}
