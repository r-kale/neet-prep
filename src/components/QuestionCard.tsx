/** Header chip strip + question text + diagram badge — used by Mistake and Quiz views. */
import type { ReactNode } from "react";

import type { AkashQuestion, AnyQuestion, PyqQuestion } from "../types.js";
import { difficultyColor, subjectColor } from "../lib/utils.js";
import { DiagramBadge } from "./DiagramBadge.js";
import { LatexText } from "./LatexText.js";

interface Props {
  question: AnyQuestion;
  /** Slot below the chips, before the question text (e.g. bookmark button). */
  trailing?: ReactNode;
}

export function QuestionCard({ question, trailing }: Props) {
  const isPyq = question.source === "pyq";
  const meta = (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={`rounded-full border px-2 py-0.5 font-semibold ${subjectColor[question.subject]}`}>
        {question.subject}
      </span>
      <span className={`rounded-full border px-2 py-0.5 font-semibold ${difficultyColor[question.difficulty]}`}>
        {question.difficulty}
      </span>
      {isPyq ? (
        <PyqMeta q={question as PyqQuestion} />
      ) : (
        <AkashMeta q={question as AkashQuestion} />
      )}
      {question.has_diagram && <DiagramBadge />}
      <span className="ml-auto font-mono text-[10px] text-ink-400">{question.id}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
      {meta}
      {trailing}
      <div className="mt-3 text-base leading-relaxed text-ink-900">
        <LatexText text={question.question_text} />
      </div>
    </div>
  );
}

function AkashMeta({ q }: { q: AkashQuestion }) {
  return (
    <>
      <span className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-ink-700">
        {q.paper.toUpperCase()} · Q{q.q_no}
      </span>
      <span className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-ink-700">
        {q.topic} <span className="text-ink-400">·</span> {q.sub_topic}
      </span>
    </>
  );
}

function PyqMeta({ q }: { q: PyqQuestion }) {
  return (
    <>
      <span className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-ink-700">
        {q.paper_code} · Q{q.q_no}
      </span>
      <span
        className="max-w-[28ch] truncate rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-ink-700"
        title={q.topic_tag}
      >
        {q.topic_tag}
      </span>
      {q.in_2026_syllabus && (
        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-700">
          2026 syllabus
        </span>
      )}
    </>
  );
}
