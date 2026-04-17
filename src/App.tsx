import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Loading } from "./components/Loading.js";
import { NavBar } from "./components/NavBar.js";
import { Dashboard } from "./routes/Dashboard.js";

// Heavy routes are code-split so the initial bundle stays small.
const Mistakes = lazy(() => import("./routes/Mistakes.js").then((m) => ({ default: m.Mistakes })));
const MistakeDetail = lazy(() => import("./routes/MistakeDetail.js").then((m) => ({ default: m.MistakeDetail })));
const Practice = lazy(() => import("./routes/Practice.js").then((m) => ({ default: m.Practice })));
const Quiz = lazy(() => import("./routes/Quiz.js").then((m) => ({ default: m.Quiz })));
const Results = lazy(() => import("./routes/Results.js").then((m) => ({ default: m.Results })));
const Topics = lazy(() => import("./routes/Topics.js").then((m) => ({ default: m.Topics })));
const TopicDetail = lazy(() => import("./routes/TopicDetail.js").then((m) => ({ default: m.TopicDetail })));
const Bookmarks = lazy(() => import("./routes/Bookmarks.js").then((m) => ({ default: m.Bookmarks })));
const Review = lazy(() => import("./routes/Review.js").then((m) => ({ default: m.Review })));
const Settings = lazy(() => import("./routes/Settings.js").then((m) => ({ default: m.Settings })));

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Suspense fallback={<Loading label="Loading page…" />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/mistakes/:id" element={<MistakeDetail />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/quiz/:sessionId" element={<Quiz />} />
            <Route path="/results/:sessionId" element={<Results />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/topics/:slug" element={<TopicDetail />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/review" element={<Review />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
