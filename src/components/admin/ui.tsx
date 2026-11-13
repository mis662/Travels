import type { ReactNode } from "react";
import { STATUS_COLORS, statusLabel, type BookingStatus } from "@/lib/booking/status";

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_COLORS[status as BookingStatus] ?? "bg-slate-100"}`}>
      {statusLabel(status)}
    </span>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      {title && <h2 className="mb-3 font-semibold text-slate-900">{title}</h2>}
      {children}
    </section>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty && <p className="p-6 text-center text-sm text-slate-500">Nothing to show.</p>}
    </div>
  );
}

const DAY = 86400_000;

/** Red if expired, amber if within 30 days. */
export function ExpiryDate({ date }: { date: Date }) {
  const days = Math.ceil((date.getTime() - Date.now()) / DAY);
  const text = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(date);
  if (days < 0) return <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-800">{text} (expired)</span>;
  if (days <= 30) return <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">{text} ({days}d left)</span>;
  return <span>{text}</span>;
}

export function isExpiringSoon(date: Date) {
  return date.getTime() - Date.now() <= 30 * DAY;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
