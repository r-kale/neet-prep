# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal, offline-capable NEET-exam study tool. It is a **client-only SPA** — no backend, no account, no network after first load. All user progress lives in the browser's `localStorage`. It ships as static files to GitHub Pages.

Two distinct question corpora drive the app:
- **Akash** — ~900 graded practice-test questions across 5 papers, already answered by the student and reconciled against official answer keys. These power the Dashboard and Mistakes review.
- **PYQ** — ~5,500 NEET past-year questions (2006–2025) for fresh practice quizzes.

## Commands

```bash
npm install
npm run dev          # runs preprocess, then starts Vite dev server on :5173
npm run preprocess   # regenerate public/data/*.json from data-source/ (tsx scripts/preprocess.ts)
npm run build        # tsc -b (typecheck) + vite build; prebuild runs preprocess automatically
npm run preview      # serve the production build locally
```

There is **no test runner and no linter** configured. Type safety is enforced by `tsc` (strict mode) during `npm run build` — run `npx tsc -b` to typecheck without bundling.

## Build pipeline & the data layer (most important to understand)

The app never reads `data-source/` at runtime. A build-time preprocessor transforms raw JSON into clean, typed, app-ready files:

```
data-source/akash/*.json   ──┐
data-source/neet_pyq_export.json ──► scripts/preprocess.ts ──► public/data/{akash,pyq,topic-index,stats}.json
```

Key facts:
- **`public/data/` is git-ignored and generated.** It will not exist on a fresh clone until you run `npm run preprocess` (or `npm run dev`/`build`, which do it for you). If the app shows fetch errors for `data/*.json`, the preprocess step hasn't run.
- `npm run dev` and `prebuild` both invoke preprocess, so you rarely call it directly — but you **must** re-run it after editing anything under `data-source/` or changing `scripts/preprocess.ts`.
- Adding an Akash paper requires editing the hardcoded `files` array in `scripts/preprocess.ts:loadAkash()` — the filename (not the embedded `question_paper` field, which is unreliable) determines the paper code.
- The preprocessor handles **two Akash schema generations**: legacy (`result`, `student_answer`, single `rough_work_audit`) and reconciled (`student_result`, `student_marked_option`, `final_correct_option`, split rough-work fields). Reconciled fields win when present. Mirror this when touching Akash parsing.

Runtime data access lives in `src/lib/data.ts`:
- Akash + stats + topic-index are **eager-loaded** as memoized singletons (small, used everywhere); kicked off in `src/main.tsx` before React mounts.
- PYQ data is **lazy-loaded** on first use. Use the `useEagerData()` / `usePyq()` hooks in components, or `loadEager()` / `loadPyq()` / `findQuestion(id)` imperatively.

## Architecture conventions

- **Stack:** Vite + React 18 + TypeScript (strict) + Tailwind + React Router v6 (`HashRouter`) + KaTeX + Recharts.
- **Imports use `.js` extensions on local TS files** (e.g. `import { App } from "./App.js"`). This is intentional ESM/bundler resolution — keep new imports consistent (`./foo.js` for a `foo.tsx`/`foo.ts` file).
- **`HashRouter` is deliberate** — it makes deep links work on GitHub Pages without server rewrites. Don't switch to `BrowserRouter`.
- **Asset base path:** `vite.config.ts` reads `BASE_PATH` (e.g. `/neet-prep/`) so assets resolve under the Pages subpath. Always build data URLs via `import.meta.env.BASE_URL` (see `dataUrl()` in `data.ts`), never hardcode `/data/...`.
- **Route code-splitting:** every route except `Dashboard` is `lazy()`-imported in `src/App.tsx` to keep the initial bundle small. Add new routes the same way.
- **Subject taxonomy mismatch:** Akash splits Biology into `Botany`/`Zoology`; PYQ keeps everything as `Biology`. Use `pyqSubjectFor()` (in `topicMatch.ts`) whenever you map an Akash subject onto the PYQ pool.

### localStorage layer (`src/lib/storage.ts`)
- All keys are namespaced with `KEY_PREFIX = "v1:"`. **Bump this prefix if you change a stored shape** — there is no migration logic.
- A tiny pub/sub makes writes reactive across components; subscribe via the `useStored(key, fallback)` hook.
- Typed accessor objects (`QuizHistory`, `InProgress`, `Bookmarks`, `SeenPyqs`, `WrongPyqs`, `Mastered`, `SR`) wrap each key. When adding a new persisted key, also add it to `ALL_KEYS` so export/import/clear in Settings stays complete.

### Spaced repetition (`src/lib/sr.ts`)
- Interval ladder: `[1, 3, 7, 14, 30]` days. A miss steps the interval **back** one rung; a review success steps forward; "still confused" resets to rung 0; "mastered" removes the item and adds it to the `Mastered` set (which suppresses future auto-seeding).
- `seedFromAkashMistakes()` runs once on Dashboard mount, staggering initial due dates over ~3 days. It's idempotent — safe to call repeatedly.

### Quiz flow
- A quiz is a `QuizSession` (filters + ordered `questionIds` + accumulated `answers`). The active session is persisted to `in-progress-quiz` on **every** answer for crash recovery; finished sessions move to `quiz-history`.
- `QuizFilters.fixedIds` pins a quiz to an exact ID list — used for SR review, "similar PYQs", topic drill-downs, and "redo wrong from a past session". Otherwise filters select from the PYQ pool.
- In `Quiz.tsx`, the question-loading effect keys off the question ID (not the whole session) so that auto-saving an answer doesn't reset the reveal state — preserve that when editing.

### Topic similarity search
- `findSimilarPyqs()` (`topicMatch.ts`) does BM25-lite TF-IDF scoring over PYQ `topic_tag`s, with a mandatory subject pre-filter and bigrams weighted 2×. The IDF/postings index is precomputed in `preprocess.ts:buildTopicIndex()`.
- **The tokenizer (`tokenize`/`stem`/stopwords) is duplicated** in `scripts/preprocess.ts` and `src/lib/topicMatch.ts` and must stay byte-for-byte equivalent — runtime query tokens have to match the index keys built at compile time. Change both together.

## Deployment

`.github/workflows/deploy.yml` runs on push to `main` (Node 24): `npm ci` → `npm run build` (with `BASE_PATH` from the `BASE_PATH` repo variable) → publishes `./dist` to the `gh-pages` branch via `peaceiris/actions-gh-pages`. Pages must be set to serve from the `gh-pages` branch root.
