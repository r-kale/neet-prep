# NEET Prep — Mistake Review & Practice

A personal, offline-capable study tool built on your Akash practice-test analysis (900 graded questions across 5 papers, with reconciled answer keys) and 5,546 NEET past-year questions (2006–2025).

## Features

| Feature | What it does |
|---|---|
| **Dashboard** | Score cards, subject/difficulty charts, top-10 weak topics |
| **Mistakes** | Browse all incorrect/not-attempted Akash questions with filters |
| **Mistake detail** | Your answer vs correct, rough-work audit, explanation, + similar PYQs via topic matching |
| **Practice** | Filter 5,546 PYQs by subject, year, difficulty, topic, syllabus; launch a quiz |
| **Quiz** | One question at a time, instant reveal, crash-safe (auto-saves every answer) |
| **Topics** | All topics with your accuracy; drill into any topic for PYQ practice |
| **Spaced review** | Wrong questions resurface at 1d / 3d / 7d / 14d / 30d intervals |
| **Bookmarks** | Save any question for quick re-reading |
| **Settings** | Export / import all progress as JSON |

All data lives in the browser (`localStorage`). No account, no backend, no internet needed after first load.

---

## Deploying to GitHub Pages

### First time setup

1. **Create a new GitHub repo** (e.g. `neet-prep`), push this folder to `main`.

2. **Set the base path** — go to the repo → **Settings → Secrets and variables → Actions → Variables** and add:
   ```
   Name:  BASE_PATH
   Value: /neet-prep/
   ```
   (replace `neet-prep` with your actual repo name)

3. **Enable Pages** — go to **Settings → Pages** and set:
   - Source: **Deploy from a branch**
   - Branch: `gh-pages` / `/ (root)`

4. Push any commit to `main` — the GitHub Action builds and deploys automatically.

5. Your app is live at `https://<your-username>.github.io/neet-prep/`

### Subsequent deploys

Just push to `main`. The action handles the rest.

---

## Running locally

```bash
npm install
npm run dev          # runs preprocess + vite dev server
```

Open [http://localhost:5173](http://localhost:5173).

### Rebuilding the data files

```bash
npm run preprocess   # regenerates public/data/*.json from data-source/
```

Run this whenever you add new Akash paper JSONs to `data-source/akash/`.

---

## Adding more Akash papers

1. Export the analysed paper as a JSON array (same schema as existing files).
2. Drop it in `data-source/akash/`.
3. Run `npm run dev` or `npm run build` — the preprocessor picks it up automatically.

---

## Tech stack

- **Vite + React 18 + TypeScript** (strict)
- **Tailwind CSS** for styling
- **React Router v6** (HashRouter, works on GitHub Pages)
- **KaTeX** for LaTeX rendering
- **Recharts** for charts
- **GitHub Actions** → `peaceiris/actions-gh-pages` for deploy
