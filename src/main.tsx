import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";

import { App } from "./App.js";
import { loadEager } from "./lib/data.js";
import "./styles.css";

// Kick off eager data fetch before React even mounts so the Dashboard
// is ready (or nearly ready) by the time the user lands.
loadEager().catch(() => {/* handled inside useEagerData */});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
