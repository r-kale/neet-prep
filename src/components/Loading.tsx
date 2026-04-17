interface Props {
  label?: string;
}

export function Loading({ label = "Loading…" }: Props) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-ink-500">
      <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-ink-300" />
      {label}
    </div>
  );
}

export function ErrorBox({ error }: { error: Error | string }) {
  const msg = typeof error === "string" ? error : error.message;
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <strong>Something went wrong:</strong> {msg}
    </div>
  );
}
