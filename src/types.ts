// Subject as it appears across both data sources after normalization.
export type Subject = "Physics" | "Chemistry" | "Biology" | "Botany" | "Zoology";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Result = "Correct" | "Incorrect" | "Not Attempted";
export type Source = "akash" | "pyq";

export interface Options {
  "1": string;
  "2": string;
  "3": string;
  "4": string;
}

/** Akash practice-test question — already graded with student's answer. */
export interface AkashQuestion {
  id: string; // akash-{paper}-{q_no}
  source: "akash";
  paper: string; // e.g. "cst-02a"
  q_no: number;
  subject: Subject;
  topic: string;
  sub_topic: string;
  question_text: string;
  options: Options;
  correct_option: 1 | 2 | 3 | 4;
  student_answer: 1 | 2 | 3 | 4 | null;
  result: Result;
  explanation: string;
  rough_work_audit: string;
  difficulty: Difficulty;
  ncert_reference: string;
  has_diagram: boolean; // true if question_text contains [Image...]
}

/** NEET past-year question, cleaned and normalized. */
export interface PyqQuestion {
  id: string; // pyq-{paper_id}-{q_no}
  source: "pyq";
  paper_id: number;
  paper_code: string; // "AIPMT 2006", "NEET 2024", etc.
  year: number;
  q_no: number;
  subject: Subject;
  topic_tag: string;
  question_text: string;
  options: Options;
  correct_option: 1 | 2 | 3 | 4;
  difficulty: Difficulty;
  in_2026_syllabus: boolean;
  has_diagram: boolean;
}

export type AnyQuestion = AkashQuestion | PyqQuestion;

/** Aggregate stats precomputed at build time. */
export interface AkashStats {
  total: number;
  correct: number;
  incorrect: number;
  not_attempted: number;
  bySubject: Array<{ subject: Subject; total: number; correct: number; incorrect: number; not_attempted: number }>;
  byDifficulty: Array<{ difficulty: Difficulty; total: number; correct: number; incorrect: number }>;
  byPaper: Array<{ paper: string; total: number; correct: number; incorrect: number; not_attempted: number }>;
  topWeakTopics: Array<{ topic: string; subject: Subject; total: number; mistakes: number }>;
}

export interface PyqStats {
  total: number;
  bySubject: Array<{ subject: Subject; total: number }>;
  byYear: Array<{ year: number; total: number }>;
  byDifficulty: Array<{ difficulty: Difficulty; total: number }>;
  inSyllabus2026: number;
}

/** Topic index used for similar-question lookup. */
export interface TopicIndex {
  /** token -> IDF weight (computed over PYQ corpus) */
  idf: Record<string, number>;
  /** token -> array of PYQ ids that contain it in their topic_tag */
  postings: Record<string, string[]>;
}

/* ───────────────────────── Quiz / progress types (runtime, in localStorage) ───────────────────────── */

export interface QuizFilters {
  subjects?: Subject[];
  yearMin?: number;
  yearMax?: number;
  difficulties?: Difficulty[];
  inSyllabus2026Only?: boolean;
  excludeSeen?: boolean;
  topicQuery?: string;
  count?: number;
  /** When set, the quiz is restricted to this exact ID list (e.g. SR review or "similar PYQs"). */
  fixedIds?: string[];
  label?: string;
}

export interface QuizAnswer {
  questionId: string;
  chosen: 1 | 2 | 3 | 4 | null;
  correct: 1 | 2 | 3 | 4;
  isCorrect: boolean;
  answeredAt: number; // epoch ms
}

export interface QuizSession {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  filters: QuizFilters;
  questionIds: string[];
  answers: QuizAnswer[];
  /** When true, session is finished and stored in history. */
  finished: boolean;
}

export interface SRItem {
  id: string;
  source: Source;
  due: number; // epoch ms
  intervalIdx: number; // index into the interval ladder
  lastReviewedAt: number;
  /** number of times this question has been missed in total */
  misses: number;
}

export interface WrongPyqRecord {
  id: string;
  lastWrongAt: number;
  attempts: number;
}
