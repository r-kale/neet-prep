import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Loading, ErrorBox } from "../components/Loading.js";
import { useEagerData, usePyq } from "../lib/data.js";
import { findSimilarPyqs } from "../lib/topicMatch.js";
import { InProgress, QuizHistory } from "../lib/storage.js";
import { difficultyColor, makeSessionId, pct, subjectColor, unslugifyTopic } from "../lib/utils.js";
import type { QuizSession, Subject } from "../types.js";

export function TopicDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: eager, error: eagerErr } = useEagerData();
  const { data: pyqData, error: pyqErr } = usePyq();

  const parsed = slug ? unslugifyTopic(slug) : null;

  const { questions, subject, topic } = useMemo(() => {
    if (!eager || !parsed) return { questions: [], subject: null as Subject | null, topic: "" };
    const subjectRaw = parsed.subject;
    // Normalize subject capitalization.
    const normalSubject = (subjectRaw.charAt(0).toUpperCase() + subjectRaw.slice(1)) as Subject;
    const topicSlug = parsed.topicSlug;
    const qs = eager.akash.filter((q) => {
      const qSlug = q.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return q.subject === normalSubject && qSlug === topicSlug;
    });
    const topicName = qs[0]?.topic ?? topicSlug.replace(/-/g, " ");
    return { questions: qs, subject: normalSubject, topic: topicName };
  }, [eager, parsed]);

  const correct = questions.filter((q) => q.result === "Correct").length;
  const mistakes = questions.filter((q) => q.result !== "Correct").length;

  const similarPyqs = useMemo(() => {
    if (!eager || !pyqData || !subject || !topic) return [];
    // find first sub_topic from questions for richer query
    const subTopic = questions[0]?.sub_topic ?? "";
    return findSimilarPyqs(
      `${topic} ${subTopic}`,
      subject,
      eager.topicIndex,
      pyqData.pyqById,
      { limit: 20 },
    );
  }, [eager, pyqData, subject, topic, questions]);

  function startTopicQuiz() {
    if (!similarPyqs.length) return;
    const ids = similarPyqs.map((m) => m.pyqId);
    const sessionId = makeSessionId();
    const session: QuizSession = {
      sessionId,
      startedAt: Date.now(),
      filters: {
        fixedIds: ids,
        label: `${topic} — PYQ practice`,
      },
      questionIds: ids,
      answers: [],
      finished: false,
    };
    InProgress.save(session);
    QuizHistory.push(session);
    navigate(`/quiz/${sessionId}`);
  }

  if (eagerErr) return <ErrorBox error={eagerErr} />;
  if (!eager) return <Loading label="Loading topic…" />;

  if (!questions.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-500">Topic not found.</p>
        <Link to="/topics" className="mt-2 inline-block text-sm font-semibold text-indigo-700 underline">
          ← Back to topics
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <Link to="/topics" className="text-sm text-ink-500 hover:text-ink-800">← Topics</Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {subject && (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${subjectColor[subject]}`}>
                {subject}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{topic}</h1>
          <p className="mt-1 text-sm text-ink-600">
            {questions.length} questions in your Akash tests · {pct(correct, questions.length)} accuracy
          </p>
        </div>
        {similarPyqs.length > 0 && (
          <button
            type="button"
            onClick={startTopicQuiz}
            className="rounded-md bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800"
          >
            Practice {similarPyqs.length} PYQs →
          </button>
        )}
      </header>

      {/* Akash performance */}
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-600">Your Akash performance</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-700">{correct}</div>
            <div className="text-xs text-ink-500">Correct</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-700">{mistakes}</div>
            <div className="text-xs text-ink-500">Mistakes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink-900">{pct(correct, questions.length)}</div>
            <div className="text-xs text-ink-500">Accuracy</div>
          </div>
        </div>

        <ul className="mt-4 grid gap-2">
          {questions.map((q) => (
            <li key={q.id}>
              <Link
                to={q.result !== "Correct" ? `/mistakes/${q.id}` : "#"}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                  q.result === "Correct"
                    ? "border-emerald-200 bg-emerald-50 cursor-default"
                    : "border-rose-200 bg-rose-50 hover:border-rose-300"
                }`}
              >
                <span className={`rounded-full border px-1.5 py-0.5 font-semibold ${difficultyColor[q.difficulty]}`}>
                  {q.difficulty}
                </span>
                <span className="flex-1 text-ink-700">{q.sub_topic}</span>
                <span className={`font-semibold ${q.result === "Correct" ? "text-emerald-700" : "text-rose-700"}`}>
                  {q.result}
                  {q.result !== "Correct" && " · Review →"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Similar PYQs preview */}
      <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">Similar PYQs found</h2>
          {pyqErr && <span className="text-xs text-rose-600">Could not load PYQ data</span>}
          {!pyqData && !pyqErr && <Loading label="Searching PYQ pool…" />}
        </div>
        {pyqData && (
          <>
            {similarPyqs.length === 0 ? (
              <p className="text-sm text-ink-500">No close PYQ matches found for this topic.</p>
            ) : (
              <ul className="grid gap-2">
                {similarPyqs.slice(0, 8).map(({ pyqId }) => {
                  const q = pyqData.pyqById.get(pyqId);
                  if (!q) return null;
                  return (
                    <li key={pyqId} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs">
                      <span className={`rounded-full border px-1.5 py-0.5 font-semibold ${difficultyColor[q.difficulty]}`}>
                        {q.difficulty}
                      </span>
                      <span className="font-medium text-ink-700">{q.paper_code}</span>
                      <span className="flex-1 text-ink-500">{q.topic_tag}</span>
                      {q.in_2026_syllabus && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-700">2026</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
