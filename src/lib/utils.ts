/** Tiny shared helpers used across routes. */
import type { Difficulty, Subject } from "../types.js";

export const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology", "Botany", "Zoology"];
export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

export const subjectColor: Record<Subject, string> = {
  Physics: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Chemistry: "bg-amber-100 text-amber-800 border-amber-200",
  Biology: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Botany: "bg-green-100 text-green-800 border-green-200",
  Zoology: "bg-teal-100 text-teal-800 border-teal-200",
};

export const difficultyColor: Record<Difficulty, string> = {
  Easy: "bg-green-100 text-green-800 border-green-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Hard: "bg-red-100 text-red-800 border-red-200",
};

export function pct(n: number, d: number): string {
  if (d === 0) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function makeSessionId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fmtDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtRelative(epochMs: number): string {
  const diff = epochMs - Date.now();
  const abs = Math.abs(diff);
  const days = Math.round(abs / 86_400_000);
  const hours = Math.round(abs / 3_600_000);
  if (abs < 60_000) return diff < 0 ? "just now" : "in a moment";
  if (abs < 3_600_000) {
    const mins = Math.round(abs / 60_000);
    return diff < 0 ? `${mins}m ago` : `in ${mins}m`;
  }
  if (abs < 86_400_000) return diff < 0 ? `${hours}h ago` : `in ${hours}h`;
  return diff < 0 ? `${days}d ago` : `in ${days}d`;
}

/** Slugify a topic for URL paths (kept stable + readable). */
export function slugifyTopic(subject: Subject, topic: string): string {
  return `${subject.toLowerCase()}--${topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

export function unslugifyTopic(slug: string): { subject: string; topicSlug: string } | null {
  const idx = slug.indexOf("--");
  if (idx < 0) return null;
  return { subject: slug.slice(0, idx), topicSlug: slug.slice(idx + 2) };
}
