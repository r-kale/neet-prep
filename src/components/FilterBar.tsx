/** Compact, accessible filter bar shared by Mistakes and Practice routes. */
import type { Difficulty, Subject } from "../types.js";
import { difficultyColor, subjectColor } from "../lib/utils.js";

interface ChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  className?: string;
}

export function Chip({ label, active, onToggle, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
        active ? className ?? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
      }`}
    >
      {label}
    </button>
  );
}

interface SubjectChipsProps {
  subjects: Subject[];
  selected: Subject[];
  onChange: (next: Subject[]) => void;
}

export function SubjectChips({ subjects, selected, onChange }: SubjectChipsProps) {
  const toggle = (s: Subject) => {
    onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {subjects.map((s) => (
        <Chip key={s} label={s} active={selected.includes(s)} onToggle={() => toggle(s)} className={subjectColor[s]} />
      ))}
    </div>
  );
}

interface DifficultyChipsProps {
  selected: Difficulty[];
  onChange: (next: Difficulty[]) => void;
}

export function DifficultyChips({ selected, onChange }: DifficultyChipsProps) {
  const all: Difficulty[] = ["Easy", "Medium", "Hard"];
  const toggle = (d: Difficulty) => {
    onChange(selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((d) => (
        <Chip key={d} label={d} active={selected.includes(d)} onToggle={() => toggle(d)} className={difficultyColor[d]} />
      ))}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700">
      <span>{label}</span>
      {children}
      {hint && <span className="font-normal text-ink-500">{hint}</span>}
    </label>
  );
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
}

export function Select<T extends string>({ value, onChange, options }: SelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-800 focus:border-ink-500 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
