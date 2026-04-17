import { useStored } from "../lib/storage.js";

export function BookmarkButton({ id }: { id: string }) {
  const [bookmarks, setBookmarks] = useStored<string[]>("bookmarks", []);
  const active = bookmarks.includes(id);
  return (
    <button
      type="button"
      onClick={() => setBookmarks(active ? bookmarks.filter((x) => x !== id) : [...bookmarks, id])}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {active ? "Bookmarked" : "Bookmark"}
    </button>
  );
}
