/**
 * Spaced-repetition scheduling. When a question is missed it enters the
 * queue and resurfaces after 1d, 3d, 7d, 14d, 30d. Marking "still confused"
 * resets the interval; "mastered" removes it from the queue entirely.
 */
import type { SRItem, Source } from "../types.js";
import { Mastered, SR } from "./storage.js";

const DAY = 24 * 60 * 60 * 1000;
const INTERVALS_DAYS = [1, 3, 7, 14, 30];

function dueIn(intervalIdx: number): number {
  const days = INTERVALS_DAYS[Math.min(intervalIdx, INTERVALS_DAYS.length - 1)];
  return Date.now() + days * DAY;
}

/** Called whenever a question is missed (Akash analysis import OR live PYQ quiz wrong-answer). */
export function recordMiss(id: string, source: Source): void {
  if (Mastered.has(id)) return; // mastered overrides
  const existing = SR.list().find((s) => s.id === id);
  const item: SRItem = existing
    ? {
        ...existing,
        misses: existing.misses + 1,
        lastReviewedAt: Date.now(),
        intervalIdx: Math.max(0, existing.intervalIdx - 1), // step back one rung
        due: dueIn(Math.max(0, existing.intervalIdx - 1)),
      }
    : {
        id,
        source,
        misses: 1,
        intervalIdx: 0,
        lastReviewedAt: Date.now(),
        due: dueIn(0),
      };
  SR.upsert(item);
}

/** Called when the user reviews and feels confident — advances to next interval. */
export function recordReviewSuccess(id: string): void {
  const existing = SR.list().find((s) => s.id === id);
  if (!existing) return;
  const nextIdx = Math.min(existing.intervalIdx + 1, INTERVALS_DAYS.length - 1);
  SR.upsert({
    ...existing,
    intervalIdx: nextIdx,
    lastReviewedAt: Date.now(),
    due: dueIn(nextIdx),
  });
}

/** "Still confused" — reset back to the 1-day interval. */
export function recordReviewFailure(id: string): void {
  const existing = SR.list().find((s) => s.id === id);
  if (!existing) return;
  SR.upsert({
    ...existing,
    intervalIdx: 0,
    misses: existing.misses + 1,
    lastReviewedAt: Date.now(),
    due: dueIn(0),
  });
}

export function markMastered(id: string): void {
  Mastered.add(id);
  SR.remove(id);
}

export function unmarkMastered(id: string): void {
  Mastered.remove(id);
}

export function dueNow(): SRItem[] {
  const now = Date.now();
  return SR.list()
    .filter((s) => s.due <= now)
    .sort((a, b) => a.due - b.due);
}

export function dueCount(): number {
  return dueNow().length;
}

/**
 * Seed the SR queue from existing Akash mistakes the first time the app
 * boots. Idempotent — only adds items that aren't already in the queue
 * or in the mastered set.
 */
export function seedFromAkashMistakes(akashMistakeIds: string[]): void {
  const existing = new Set(SR.list().map((s) => s.id));
  const mastered = new Set(Mastered.list());
  for (const id of akashMistakeIds) {
    if (existing.has(id) || mastered.has(id)) continue;
    // Stagger initial dues across the next ~3 days so the queue isn't
    // 154 items strong on day one.
    const offsetDays = Math.random() * 3;
    SR.upsert({
      id,
      source: "akash",
      misses: 1,
      intervalIdx: 0,
      lastReviewedAt: Date.now(),
      due: Date.now() + offsetDays * DAY,
    });
  }
}
