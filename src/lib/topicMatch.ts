/**
 * Find PYQs whose topic is similar to a given query string (typically an
 * Akash question's `topic + sub_topic`). BM25-lite scoring with mandatory
 * subject pre-filter. Mirrors tokenization in scripts/preprocess.ts so the
 * runtime tokens match the index keys.
 */
import type { PyqQuestion, Subject, TopicIndex } from "../types.js";

const ENGLISH_STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "in", "on", "at", "to", "for", "with", "by",
  "from", "is", "are", "was", "were", "be", "been", "being", "as", "that", "this",
  "these", "those", "it", "its", "into", "over", "under", "about", "vs", "via",
  "general", "other", "misc", "miscellaneous",
]);

function stem(token: string): string {
  if (token.length <= 4) return token;
  for (const suf of ["tional", "tion", "ions", "ing", "ies", "ied", "ers", "er", "ed", "es", "s"]) {
    if (token.endsWith(suf) && token.length - suf.length >= 3) {
      return token.slice(0, -suf.length);
    }
  }
  return token;
}

function tokenize(input: string): { unigrams: string[]; bigrams: string[] } {
  const cleaned = input
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ");

  const raw = cleaned
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !ENGLISH_STOPWORDS.has(t))
    .map(stem)
    .filter((t) => t.length >= 2);

  const unigrams = Array.from(new Set(raw));
  const bigrams: string[] = [];
  for (let i = 0; i < raw.length - 1; i++) {
    bigrams.push(`${raw[i]} ${raw[i + 1]}`);
  }
  return { unigrams, bigrams: Array.from(new Set(bigrams)) };
}

/**
 * Akash splits Biology into Botany + Zoology, but PYQ keeps everything as
 * "Biology". Map both to Biology when querying the PYQ pool.
 */
export function pyqSubjectFor(subject: Subject): Subject {
  if (subject === "Botany" || subject === "Zoology") return "Biology";
  return subject;
}

export interface SimilarMatch {
  pyqId: string;
  score: number;
}

/**
 * Score every PYQ token-overlap candidate; return top N. Bigrams weighted 2×.
 */
export function findSimilarPyqs(
  query: string,
  subject: Subject,
  index: TopicIndex,
  pyqById: Map<string, PyqQuestion>,
  opts: { limit?: number; excludeIds?: Set<string> } = {},
): SimilarMatch[] {
  const limit = opts.limit ?? 10;
  const exclude = opts.excludeIds ?? new Set<string>();
  const targetSubject = pyqSubjectFor(subject);
  const { unigrams, bigrams } = tokenize(query);

  const scores = new Map<string, number>();
  const accumulate = (token: string, weight: number): void => {
    const idf = index.idf[token];
    const posting = index.postings[token];
    if (!idf || !posting) return;
    const w = idf * weight;
    for (const id of posting) {
      const q = pyqById.get(id);
      if (!q) continue;
      if (q.subject !== targetSubject) continue;
      if (exclude.has(id)) continue;
      scores.set(id, (scores.get(id) ?? 0) + w);
    }
  };

  for (const t of unigrams) accumulate(t, 1);
  for (const t of bigrams) accumulate(t, 2);

  return Array.from(scores.entries())
    .map(([pyqId, score]) => ({ pyqId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
