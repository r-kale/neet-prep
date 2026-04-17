import { useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { BookmarkButton } from "../components/BookmarkButton.js";
import { DiagramBadge } from "../components/DiagramBadge.js";
import { LatexText } from "../components/LatexText.js";
import { Loading, ErrorBox } from "../components/Loading.js";
import { OptionList } from "../components/OptionList.js";
import { QuestionCard } from "../components/QuestionCard.js";
import { useEagerData, usePyq } from "../lib/data.js";
import { markMastered, recordMiss, recordReviewSuccess, unmarkMastered } from "../lib/sr.js";
import { InProgress, QuizHistory, useStored } from "../lib/storage.js";
import { findSimilarPyqs } from "../lib/topicMatch.js";
import { makeSessionId } from "../lib/utils.js";
import type { QuizSession, SRItem } from "../types.js";

export function MistakeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: eager, error: eagerErr } = useEagerData();
  const { data: pyqData, error: pyqErr } = usePyq();

  const [srState] = useStored<SRItem[]>("sr-state", []);
  const [mastered] = useStored<string[]>("mastered", []);

  const question = useMemo(
    () => eager?.akashById.get(id ?? "") ?? null,
    [eager, id],
  );

  const similarMatches = useMemo(() => {
    if (!question || !eager || !pyqData) return [];
    return findSimilarPyqs(
      `${question.topic} ${question.sub_topic}`,
      question.subject,
      eager.topicIndex,
      pyqData.pyqById,
      { limit: 10 },
    );
  }, [question, eager, pyqData]);

  const srItem = srState.find((s) => s.id === (id ?? ""));
  const isMastered = mastered.includes(id ?? "");

  const handleMastered = useCallback(() => {
    if (!id) return;
    markMastered(id);
  }, [id]);

  const handleUnmaster = useCallback(() => {
    if (!id) return;
    unmarkMastered(id);
    recordMiss(id, "akash");
  }, [id]);

  const handleConfident = useCallback(() => {
    if (!id) return;
    recordReviewSuccess(id);
  }, [id]);

  const handleConfused = useCallback(() => {
    if (!id) return;
    recordMiss(id, "akash");
  }, [id]);

  const handlePracticeSimilar = useCallback(() => {
    if (!similarMatches.length) return;
    const fixedIds = similarMatches.map((m) => m.pyqId);
    const sessionId = makeSessionId();
    const session: QuizSession = {
      sessionId,
      startedAt: Date.now(),
      filters: {
        fixedIds,
        label: `Similar to: ${question?.topic ?? "mistake"}`,
      },
      questionIds: fixedIds,
      answers: [],
      finished: false,
    };
    InProgress.save(session);
    QuizHistory.push(session);
    navigate(`/quiz/${sessionId}`);
  }, [similarMatches, question, navigate]);

  if (eagerErr) return <ErrorBox error={eagerErr} />;
  if (!eager) return <Loading label="Loading question…" />;
  if (!question) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-500">Question not found.</p>
        <Link to="/mistakes" className="mt-2 inline-block text-sm font-semibold text-indigo-700 underline">
          ← Back to mistakes
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <Link to="/mistakes" className="text-sm text-ink-500 hover:text-ink-800">
          ← Mistakes
        </Link>
        <span className="text-ink-300">|</span>
        <span className="text-sm text-ink-500">{question.paper.toUpperCase()} · Q{question.q_no}</span>
      </div>

      {/* Question */}
      <QuestionCard
        question={question}
        trailing={
          <div className="mt-3 flex flex-wrap gap-2">
            <BookmarkButton id={question.id} />
          </div>
        }
      />

      {/* Answer reveal */}
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">Answer</h2>
        <OptionList
          options={question.options}
          chosen={question.student_answer}
          correct={question.correct_option}
          reveal
        />
      </section>

      {/* Rough work audit */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-800">Your rough work — what happened</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
          {question.rough_work_audit || "No rough work analysis available."}
        </p>
      </section>

      {/* Explanation */}
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-600">Explanation</h2>
        <div className="text-sm leading-relaxed text-ink-800">
          <LatexText text={question.explanation || "No explanation available."} />
        </div>
        {question.ncert_reference && (
          <p className="mt-3 text-xs text-ink-500">
            <strong>Source:</strong> {question.ncert_reference}
          </p>
        )}
      </section>

      {/* SR / mastery controls */}
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-600">Track your confidence</h2>
        {isMastered ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">✓ Marked as mastered</span>
            <button
              type="button"
              onClick={handleUnmaster}
              className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
            >
              Remove from mastered
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConfused}
              className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
            >
              Still confused — review in 1 day
            </button>
            <button
              type="button"
              onClick={handleConfident}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              Got it — push to next interval
            </button>
            <button
              type="button"
              onClick={handleMastered}
              className="rounded-md border border-ink-300 bg-ink-50 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-100"
            >
              Mastered — remove from queue
            </button>
          </div>
        )}
        {srItem && !isMastered && (
          <p className="mt-2 text-xs text-ink-500">
            Next review due: {new Date(srItem.due).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · missed {srItem.misses} time{srItem.misses === 1 ? "" : "s"}
          </p>
        )}
      </section>

      {/* Similar PYQs */}
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">Similar NEET PYQs</h2>
            <p className="text-xs text-ink-500">
              {pyqErr
                ? "Could not load PYQ data"
                : !pyqData
                ? "Loading PYQ pool…"
                : `${similarMatches.length} questions found on ${question.topic} · ${question.sub_topic}`}
            </p>
          </div>
          {similarMatches.length > 0 && (
            <button
              type="button"
              onClick={handlePracticeSimilar}
              className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
            >
              Practice {similarMatches.length} similar PYQs →
            </button>
          )}
        </div>

        {!pyqData && !pyqErr && (
          <div className="mt-4">
            <Loading label="Finding similar questions…" />
          </div>
        )}

        {pyqData && similarMatches.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {similarMatches.slice(0, 5).map(({ pyqId }) => {
              const q = pyqData.pyqById.get(pyqId);
              if (!q) return null;
              return (
                <li
                  key={pyqId}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-ink-800">{q.paper_code} · Q{q.q_no}</span>
                  <span className="text-ink-500">{q.topic_tag}</span>
                  {q.has_diagram && <DiagramBadge />}
                </li>
              );
            })}
            {similarMatches.length > 5 && (
              <li className="text-center text-xs text-ink-500">
                +{similarMatches.length - 5} more included in the practice session
              </li>
            )}
          </ul>
        )}

        {pyqData && similarMatches.length === 0 && (
          <p className="mt-4 text-xs text-ink-500">No close matches found. Try practising this subject area via the Practice tab.</p>
        )}
      </section>
    </div>
  );
}
