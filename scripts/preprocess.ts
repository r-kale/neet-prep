/**
 * Build-time data preprocessor.
 *
 * Reads raw JSON under data-source/ and emits clean, typed, app-ready JSON
 * under public/data/:
 *
 *   akash.json         — 540 graded practice questions, normalized
 *   pyq.json           — ~5.5k PYQs with garbage entries filtered out
 *   topic-index.json   — token -> {idf, postings} for similar-question search
 *   stats.json         — { akash, pyq } aggregates for the Dashboard
 *
 * Run via `npm run preprocess` or automatically through `prebuild`.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  AkashQuestion,
  AkashStats,
  Difficulty,
  Options,
  PyqQuestion,
  PyqStats,
  Subject,
  TopicIndex,
} from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_SRC = resolve(ROOT, "data-source");
const OUT_DIR = resolve(ROOT, "public/data");

// ───────────────────────────── helpers ─────────────────────────────

function readJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJSON(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}

function normalizeSubject(raw: string): Subject {
  const s = raw.trim();
  if (s === "Physics" || s === "Chemistry" || s === "Biology" || s === "Botany" || s === "Zoology") {
    return s;
  }
  // PYQ data uses only Physics / Chemistry / Biology. Map anything unexpected to Biology as a safe default.
  if (/bot/i.test(s)) return "Botany";
  if (/zoo/i.test(s)) return "Zoology";
  if (/phys/i.test(s)) return "Physics";
  if (/chem/i.test(s)) return "Chemistry";
  return "Biology";
}

function normalizeDifficulty(raw: string | undefined | null): Difficulty {
  if (!raw) return "Medium";
  const s = raw.trim().toLowerCase();
  if (s === "easy") return "Easy";
  if (s === "hard") return "Hard";
  return "Medium";
}

function clampOpt(n: unknown): 1 | 2 | 3 | 4 {
  const v = Number(n);
  if (v === 1 || v === 2 || v === 3 || v === 4) return v;
  return 1;
}

function optFromFields(o1: string, o2: string, o3: string, o4: string): Options {
  return { "1": o1 ?? "", "2": o2 ?? "", "3": o3 ?? "", "4": o4 ?? "" };
}

function hasDiagramMarker(text: string): boolean {
  return /\[image[^\]]*\]/i.test(text);
}

// ──────────────────────── tokenization for topic index ────────────────────────

const ENGLISH_STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "in", "on", "at", "to", "for", "with", "by",
  "from", "is", "are", "was", "were", "be", "been", "being", "as", "that", "this",
  "these", "those", "it", "its", "into", "over", "under", "about", "vs", "via",
  "general", "other", "misc", "miscellaneous",
]);

/** Very light suffix-stripper. Avoids full Porter because we want stable, predictable behaviour. */
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
    .replace(/[\u2013\u2014]/g, " ") // en/em dash
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ");

  const rawTokens = cleaned
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !ENGLISH_STOPWORDS.has(t))
    .map(stem)
    .filter((t) => t.length >= 2);

  const unigrams = Array.from(new Set(rawTokens));
  const bigrams: string[] = [];
  for (let i = 0; i < rawTokens.length - 1; i++) {
    bigrams.push(`${rawTokens[i]} ${rawTokens[i + 1]}`);
  }
  return { unigrams, bigrams: Array.from(new Set(bigrams)) };
}

// ──────────────────────────── Akash pipeline ────────────────────────────

type RawAkash = {
  q_no: number;
  subject: string;
  meta_data?: { topic?: string; sub_topic?: string };
  question_text: string;
  options: Record<string, string>;
  correct_option: number;
  explanation: string;
  rough_work_audit: string;
  difficulty: string;
  ncert_reference: string;
  student_answer: number | null;
  question_paper: string;
  result: string;
};

function loadAkash(): AkashQuestion[] {
  // The embedded `question_paper` field in the raw JSON is unreliable —
  // both pst01a.json and pst03a.json have "pst-03a" hardcoded — so the filename wins.
  const files: Array<{ file: string; paper: string }> = [
    { file: "cst02a.json", paper: "cst-02a" },
    { file: "pst01a.json", paper: "pst-01a" },
    { file: "pst03a.json", paper: "pst-03a" },
  ];
  const all: AkashQuestion[] = [];
  for (const { file, paper } of files) {
    const rows = readJSON<RawAkash[]>(resolve(DATA_SRC, "akash", file));
    for (const r of rows) {
      const subject = normalizeSubject(r.subject);
      const topic = (r.meta_data?.topic ?? "").trim() || "Uncategorized";
      const sub_topic = (r.meta_data?.sub_topic ?? "").trim() || topic;
      const options: Options = {
        "1": r.options?.["1"] ?? "",
        "2": r.options?.["2"] ?? "",
        "3": r.options?.["3"] ?? "",
        "4": r.options?.["4"] ?? "",
      };
      const correct_option = clampOpt(r.correct_option);
      const student_answer =
        r.student_answer === 1 || r.student_answer === 2 || r.student_answer === 3 || r.student_answer === 4
          ? (r.student_answer as 1 | 2 | 3 | 4)
          : null;
      const result =
        r.result === "Correct" || r.result === "Incorrect" || r.result === "Not Attempted"
          ? r.result
          : student_answer === null
            ? "Not Attempted"
            : student_answer === correct_option
              ? "Correct"
              : "Incorrect";

      all.push({
        id: `akash-${paper}-${r.q_no}`,
        source: "akash",
        paper,
        q_no: r.q_no,
        subject,
        topic,
        sub_topic,
        question_text: r.question_text ?? "",
        options,
        correct_option,
        student_answer,
        result,
        explanation: r.explanation ?? "",
        rough_work_audit: r.rough_work_audit ?? "",
        difficulty: normalizeDifficulty(r.difficulty),
        ncert_reference: r.ncert_reference ?? "",
        has_diagram: hasDiagramMarker(r.question_text ?? ""),
      });
    }
  }
  return all;
}

// ──────────────────────────── PYQ pipeline ────────────────────────────

type RawPyqPaper = {
  id: number;
  paper_code: string;
  year: number;
  questions: RawPyqQuestion[];
};

type RawPyqQuestion = {
  question_number: number;
  subject: string;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_answer: number;
  topic_tag: string;
  in_2026_syllabus: number;
  difficulty: string;
  has_diagram: number;
};

function loadPyq(): PyqQuestion[] {
  const raw = readJSON<RawPyqPaper[]>(resolve(DATA_SRC, "neet_pyq_export.json"));
  const out: PyqQuestion[] = [];
  for (const paper of raw) {
    for (const q of paper.questions ?? []) {
      const options = optFromFields(q.option_1, q.option_2, q.option_3, q.option_4);
      const optionsAllEmpty = !options["1"] && !options["2"] && !options["3"] && !options["4"];
      const textLen = (q.question_text ?? "").trim().length;
      // Filter garbage: all options blank AND text very short (or purely numeric).
      if (optionsAllEmpty && (textLen < 20 || /^[\s\d]+$/.test(q.question_text ?? ""))) continue;
      // Also drop rows where we literally have no answerable options at all.
      if (optionsAllEmpty) continue;

      out.push({
        id: `pyq-${paper.id}-${q.question_number}`,
        source: "pyq",
        paper_id: paper.id,
        paper_code: paper.paper_code,
        year: paper.year,
        q_no: q.question_number,
        subject: normalizeSubject(q.subject),
        topic_tag: (q.topic_tag ?? "").trim(),
        question_text: q.question_text ?? "",
        options,
        correct_option: clampOpt(q.correct_answer),
        difficulty: normalizeDifficulty(q.difficulty),
        in_2026_syllabus: q.in_2026_syllabus === 1,
        has_diagram: q.has_diagram === 1,
      });
    }
  }
  return out;
}

// ──────────────────────────── Topic index ────────────────────────────

function buildTopicIndex(pyqs: PyqQuestion[]): TopicIndex {
  // Collect per-PYQ token sets.
  const perDoc: Array<{ id: string; tokens: string[] }> = pyqs.map((p) => {
    const subjectHint = p.subject.toLowerCase();
    const { unigrams, bigrams } = tokenize(`${p.topic_tag} ${subjectHint}`);
    return { id: p.id, tokens: [...unigrams, ...bigrams] };
  });

  // Document frequency per token.
  const df = new Map<string, number>();
  for (const doc of perDoc) {
    for (const t of new Set(doc.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }

  // Corpus-adaptive stopwords: any token in >5% of docs is too common to be useful.
  const threshold = Math.max(5, Math.floor(perDoc.length * 0.05));
  const corpusStop = new Set<string>();
  for (const [t, n] of df) if (n > threshold) corpusStop.add(t);

  // IDF and postings, skipping corpus stopwords.
  const N = perDoc.length;
  const idf: Record<string, number> = {};
  const postings: Record<string, string[]> = {};
  for (const doc of perDoc) {
    for (const t of new Set(doc.tokens)) {
      if (corpusStop.has(t)) continue;
      (postings[t] ??= []).push(doc.id);
    }
  }
  for (const [t, n] of df) {
    if (corpusStop.has(t)) continue;
    idf[t] = Math.log(1 + N / n);
  }
  return { idf, postings };
}

// ──────────────────────────── Stats ────────────────────────────

function buildAkashStats(rows: AkashQuestion[]): AkashStats {
  const subjects: Subject[] = ["Physics", "Chemistry", "Biology", "Botany", "Zoology"];
  const difficulties: Difficulty[] = ["Easy", "Medium", "Hard"];

  const bySubject = subjects
    .map((subject) => {
      const group = rows.filter((r) => r.subject === subject);
      return {
        subject,
        total: group.length,
        correct: group.filter((r) => r.result === "Correct").length,
        incorrect: group.filter((r) => r.result === "Incorrect").length,
        not_attempted: group.filter((r) => r.result === "Not Attempted").length,
      };
    })
    .filter((g) => g.total > 0);

  const byDifficulty = difficulties.map((difficulty) => {
    const group = rows.filter((r) => r.difficulty === difficulty);
    return {
      difficulty,
      total: group.length,
      correct: group.filter((r) => r.result === "Correct").length,
      incorrect: group.filter((r) => r.result !== "Correct").length,
    };
  });

  const papers = Array.from(new Set(rows.map((r) => r.paper)));
  const byPaper = papers.map((paper) => {
    const group = rows.filter((r) => r.paper === paper);
    return {
      paper,
      total: group.length,
      correct: group.filter((r) => r.result === "Correct").length,
      incorrect: group.filter((r) => r.result === "Incorrect").length,
      not_attempted: group.filter((r) => r.result === "Not Attempted").length,
    };
  });

  // Weak topics by (subject, topic): sort by mistake count, then rate.
  const topicAgg = new Map<string, { topic: string; subject: Subject; total: number; mistakes: number }>();
  for (const r of rows) {
    const key = `${r.subject}::${r.topic}`;
    const agg = topicAgg.get(key) ?? { topic: r.topic, subject: r.subject, total: 0, mistakes: 0 };
    agg.total += 1;
    if (r.result !== "Correct") agg.mistakes += 1;
    topicAgg.set(key, agg);
  }
  const topWeakTopics = Array.from(topicAgg.values())
    .filter((t) => t.mistakes > 0)
    .sort((a, b) => b.mistakes - a.mistakes || b.mistakes / b.total - a.mistakes / a.total)
    .slice(0, 15);

  return {
    total: rows.length,
    correct: rows.filter((r) => r.result === "Correct").length,
    incorrect: rows.filter((r) => r.result === "Incorrect").length,
    not_attempted: rows.filter((r) => r.result === "Not Attempted").length,
    bySubject,
    byDifficulty,
    byPaper,
    topWeakTopics,
  };
}

function buildPyqStats(rows: PyqQuestion[]): PyqStats {
  const subjects: Subject[] = ["Physics", "Chemistry", "Biology", "Botany", "Zoology"];
  const difficulties: Difficulty[] = ["Easy", "Medium", "Hard"];

  const bySubject = subjects
    .map((subject) => ({ subject, total: rows.filter((r) => r.subject === subject).length }))
    .filter((s) => s.total > 0);

  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
  const byYear = years.map((year) => ({ year, total: rows.filter((r) => r.year === year).length }));

  const byDifficulty = difficulties.map((difficulty) => ({
    difficulty,
    total: rows.filter((r) => r.difficulty === difficulty).length,
  }));

  return {
    total: rows.length,
    bySubject,
    byYear,
    byDifficulty,
    inSyllabus2026: rows.filter((r) => r.in_2026_syllabus).length,
  };
}

// ──────────────────────────── main ────────────────────────────

function main(): void {
  if (!existsSync(DATA_SRC)) {
    throw new Error(`data-source not found at ${DATA_SRC}`);
  }

  console.log("→ loading Akash practice tests…");
  const akash = loadAkash();
  console.log(`  loaded ${akash.length} Akash questions`);

  console.log("→ loading NEET PYQs…");
  const pyq = loadPyq();
  console.log(`  loaded ${pyq.length} PYQs (after garbage filter)`);

  console.log("→ building topic index…");
  const topicIndex = buildTopicIndex(pyq);
  const tokenCount = Object.keys(topicIndex.idf).length;
  console.log(`  ${tokenCount} tokens indexed`);

  console.log("→ computing stats…");
  const stats = {
    akash: buildAkashStats(akash),
    pyq: buildPyqStats(pyq),
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeJSON(resolve(OUT_DIR, "akash.json"), akash);
  writeJSON(resolve(OUT_DIR, "pyq.json"), pyq);
  writeJSON(resolve(OUT_DIR, "topic-index.json"), topicIndex);
  writeJSON(resolve(OUT_DIR, "stats.json"), stats);

  console.log(`✓ wrote data to ${OUT_DIR}`);
}

main();
