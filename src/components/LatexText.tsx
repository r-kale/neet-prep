/**
 * Renders text containing inline LaTeX delimited by $...$ (and display math
 * delimited by $$...$$). Preserves newlines.
 *
 * The source data has TeX with double-escaped backslashes (`\\\\circ` in
 * the file → `\\circ` after JSON.parse, but KaTeX wants `\circ`). We
 * normalize `\\` → `\` inside math segments only — doing it elsewhere would
 * break legitimate `\\` line breaks if they ever appear.
 */
import { Fragment, type ReactNode } from "react";
import { BlockMath, InlineMath } from "react-katex";

function normalizeMath(s: string): string {
  return s.replace(/\\\\/g, "\\");
}

interface Segment {
  kind: "text" | "inline" | "block";
  value: string;
}

function parse(input: string): Segment[] {
  const segs: Segment[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    // $$ ... $$ block math
    if (input[i] === "$" && input[i + 1] === "$") {
      const end = input.indexOf("$$", i + 2);
      if (end === -1) {
        segs.push({ kind: "text", value: input.slice(i) });
        break;
      }
      segs.push({ kind: "block", value: input.slice(i + 2, end) });
      i = end + 2;
      continue;
    }
    // $ ... $ inline math
    if (input[i] === "$") {
      const end = input.indexOf("$", i + 1);
      if (end === -1) {
        segs.push({ kind: "text", value: input.slice(i) });
        break;
      }
      segs.push({ kind: "inline", value: input.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    // text run until next $
    let next = input.indexOf("$", i);
    if (next === -1) next = n;
    segs.push({ kind: "text", value: input.slice(i, next) });
    i = next;
  }
  return segs;
}

function renderText(s: string): ReactNode {
  const lines = s.split(/\n/);
  return lines.map((line, idx) => (
    <Fragment key={idx}>
      {idx > 0 && <br />}
      {line}
    </Fragment>
  ));
}

interface Props {
  text: string;
  className?: string;
}

export function LatexText({ text, className }: Props) {
  const segs = parse(text);
  return (
    <span className={className}>
      {segs.map((seg, i) => {
        if (seg.kind === "text") return <Fragment key={i}>{renderText(seg.value)}</Fragment>;
        try {
          if (seg.kind === "inline") {
            return <InlineMath key={i} math={normalizeMath(seg.value)} />;
          }
          return <BlockMath key={i} math={normalizeMath(seg.value)} />;
        } catch {
          // Fall back to raw on TeX parse failure.
          return (
            <code key={i} className="rounded bg-red-50 px-1 text-red-800">
              {seg.value}
            </code>
          );
        }
      })}
    </span>
  );
}
