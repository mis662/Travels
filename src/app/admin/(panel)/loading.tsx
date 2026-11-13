export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
