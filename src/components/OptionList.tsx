/** Render the 4 options of a question, with optional answer highlighting. */
import type { Options } from "../types.js";
import { LatexText } from "./LatexText.js";

interface Props {
  options: Options;
  /** What the student picked (if any) — drawn with red/green tint when reveal=true. */
  chosen?: 1 | 2 | 3 | 4 | null;
  correct?: 1 | 2 | 3 | 4;
  /** When true, color reveals correct/wrong answers. */
  reveal?: boolean;
  /** When provided, makes options clickable. */
  onPick?: (n: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
}

const labels: Record<1 | 2 | 3 | 4, string> = { 1: "A", 2: "B", 3: "C", 4: "D" };

export function OptionList({ options, chosen, correct, reveal, onPick, disabled }: Props) {
  const order: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
  return (
    <ol className="mt-3 grid gap-2">
      {order.map((n) => {
        const text = options[String(n) as "1" | "2" | "3" | "4"];
        const isChosen = chosen === n;
        const isCorrect = correct === n;
        let cls = "border-ink-200 bg-white hover:bg-ink-50";
        if (reveal && isCorrect) cls = "border-emerald-400 bg-emerald-50";
        else if (reveal && isChosen && !isCorrect) cls = "border-rose-400 bg-rose-50";
        else if (isChosen && !reveal) cls = "border-indigo-400 bg-indigo-50";
        const Tag = onPick ? "button" : "div";
        const props = onPick
          ? {
              type: "button" as const,
              onClick: () => onPick(n),
              disabled: disabled || reveal,
            }
          : {};
        return (
          <li key={n}>
            <Tag
              {...props}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-90 ${cls}`}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-300 bg-white text-xs font-semibold text-ink-700">
                {labels[n]}
              </span>
              <span className="flex-1 text-sm leading-relaxed text-ink-800">
                <LatexText text={text || "(blank)"} />
              </span>
              {reveal && isCorrect && (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Correct
                </span>
              )}
              {reveal && isChosen && !isCorrect && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Your pick
                </span>
              )}
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}
