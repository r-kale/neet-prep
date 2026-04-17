import { NavLink } from "react-router-dom";

import { useStored } from "../lib/storage.js";
import type { SRItem } from "../types.js";

const links: Array<{ to: string; label: string }> = [
  { to: "/", label: "Dashboard" },
  { to: "/mistakes", label: "Mistakes" },
  { to: "/practice", label: "Practice" },
  { to: "/topics", label: "Topics" },
  { to: "/review", label: "Review" },
  { to: "/bookmarks", label: "Bookmarks" },
  { to: "/settings", label: "Settings" },
];

export function NavBar() {
  const [sr] = useStored<SRItem[]>("sr-state", []);
  const dueCount = sr.filter((s) => s.due <= Date.now()).length;
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 text-base font-semibold text-ink-900">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-900 text-sm font-bold text-white">
            N
          </span>
          NEET Prep
        </NavLink>
        <nav className="ml-auto flex flex-wrap items-center gap-1 text-sm">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `relative rounded-md px-3 py-1.5 transition ${
                  isActive ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"
                }`
              }
            >
              {label}
              {label === "Review" && dueCount > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {dueCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
