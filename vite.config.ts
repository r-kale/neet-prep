import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site at https://<user>.github.io/<repo>/.
// Override `BASE_PATH` in CI to match the repo name (e.g. "/neet-prep/").
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
