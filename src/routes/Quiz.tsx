import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { BookmarkButton } from "../components/BookmarkButton.js";
import { LatexText } from "../components/LatexText.js";
import { Loading, ErrorBox } from "../components/Loading.js";
import { OptionList } from "../components/OptionList.js";
import { QuestionCard } from "../components/QuestionCard.js";
import { findQuestion, loadEager, loadPyq } from "../lib/data.js";
import { recordMiss } from "../lib/sr.js";
import { InProgress, QuizHistory, SeenPyqs, WrongPyqs } from "../lib/storage.js";
import type { AnyQuestion, QuizAnswer, QuizSession } from "../types.js";

export function Quiz() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<QuizSession | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [chosen, setChosen] = useState<1 | 2 | 3 | 4 | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load or restore session.
  useEffect(() => {
    const inProgress = InProgress.get();
    const fromHistory = sessionId ? QuizHistory.get(sessionId) : null;
    const s = (inProgress?.sessionId === sessionId ? inProgress : fromHistory) ?? null;
    if (!s) {
      setLoadErr("Session not found. It may have expired.");
      setLoading(false);
      return;
    }
    // Resume from where we left off.
    const idx = s.answers.length < s.questionIds.length ? s.answers.length : s.questionIds.length - 1;
    setSession(s);
    setCurrentIdx(idx);
  }, [sessionId]);

  // Load the current question ONLY when the question ID changes (not on every session update).
  // Keying off the question ID prevents the answer-reveal from resetting when we save progress.
  const currentQid = session?.questionIds[currentIdx] ?? null;
  useEffect(() => {
    if (!currentQid) return;
    setLoading(true);
    setQuestion(null);
    setChosen(null);
    setRevealed(false);

    // Preload both data sources in parallel then find the question.
    Promise.all([loadEager(), loadPyq()])
      .then(() => findQuestion(currentQid))
      .then((q) => {
        setQuestion(q);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setLoadErr(String(e));
        setLoading(false);
      });
  }, [currentQid]); // intentionally excludes `session` — session updates (saving answers) must NOT reset the view

  const handlePick = useCallback(
    (n: 1 | 2 | 3 | 4) => {
      if (revealed) return;
      setChosen(n);
    },
    [revealed],
  );

  const handleSubmit = useCallback(() => {
    if (!session || !question || chosen === null) return;
    const correct = question.source === "akash" ? question.correct_option : question.correct_option;
    const isCorrect = chosen === correct;

    const answer: QuizAnswer = {
      questionId: question.id,
      chosen,
      correct,
      isCorrect,
      answeredAt: Date.now(),
    };

    const updated: QuizSession = {
      ...session,
      answers: [...session.answers, answer],
    };

    // Track seen + wrong PYQs.
    if (question.source === "pyq") {
      SeenPyqs.add([question.id]);
      if (!isCorrect) {
        WrongPyqs.record(question.id);
        recordMiss(question.id, "pyq");
      }
    }

    // Auto-save.
    InProgress.save(updated);
    QuizHistory.push(updated);
    setSession(updated);
    setRevealed(true);
  }, [session, question, chosen]);

  const handleNext = useCallback(() => {
    if (!session) return;
    const nextIdx = currentIdx + 1;
    if (nextIdx >= session.questionIds.length) {
      // Quiz finished.
      const finished: QuizSession = { ...session, finished: true, endedAt: Date.now() };
      InProgress.clear();
      QuizHistory.push(finished);
      navigate(`/results/${session.sessionId}`);
      return;
    }
    setCurrentIdx(nextIdx);
  }, [session, currentIdx, navigate]);

  const progress = session ? `${currentIdx + 1} / ${session.questionIds.length}` : "";
  const pct = session ? Math.round(((currentIdx) / session.questionIds.length) * 100) : 0;

  if (loadErr) {
    return (
      <div className="grid gap-4">
        <ErrorBox error={loadErr} />
        <Link to="/practice" className="text-sm font-semibold text-indigo-700 underline">
          ← Start a new quiz
        </Link>
      </div>
    );
  }

  if (!session || loading) return <Loading label="Loading question…" />;

  const correct = question?.source === "akash" ? question.correct_option : question?.correct_option;

  return (
    <div className="grid gap-5">
      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-600">
          <span>{session.filters.label ?? "Practice quiz"}</span>
          <span>{progress}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Running score */}
      {session.answers.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="font-semibold text-emerald-700">
            ✓ {session.answers.filter((a) => a.isCorrect).length} correct
          </span>
          <span className="text-rose-700">
            ✗ {session.answers.filter((a) => !a.isCorrect).length} wrong
          </span>
        </div>
      )}

      {/* Question card */}
      {question ? (
        <QuestionCard
          question={question}
          trailing={
            <div className="mt-2">
              <BookmarkButton id={question.id} />
            </div>
          }
        />
      ) : (
        <Loading label="Loading question…" />
      )}

      {/* Options */}
      {question && (
        <OptionList
          options={question.options}
          chosen={chosen}
          correct={correct}
          reveal={revealed}
          onPick={handlePick}
          disabled={revealed}
        />
      )}

      {/* Explanation (after reveal) */}
      {revealed && question && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            {chosen === correct ? "✓ Correct!" : "✗ Incorrect"}
            {question.source === "akash" && question.difficulty
              ? ` · ${question.difficulty}`
              : ""}
          </h3>
          {question.source === "akash" && question.explanation && (
            <div className="text-sm leading-relaxed text-indigo-900">
              <LatexText text={question.explanation} />
            </div>
          )}
          {question.source === "pyq" && (
            <p className="text-sm text-indigo-800">
              Correct answer: <strong>option {correct}</strong>.{" "}
              {question.topic_tag && <span className="text-indigo-600">{question.topic_tag}</span>}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between">
        <span className="text-xs text-ink-400">{question?.id}</span>
        <div className="flex gap-3">
          {!revealed && chosen !== null && (
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-md bg-indigo-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
            >
              Submit answer
            </button>
          )}
          {revealed && (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-md bg-ink-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-ink-700"
            >
              {currentIdx + 1 >= session.questionIds.length ? "See results →" : "Next question →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
