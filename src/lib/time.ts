/**
 * All trip dates/times entered by customers are Mumbai time (IST, UTC+5:30).
 * The server may run in any timezone (e.g. UTC on Vercel), so conversions are
 * done explicitly instead of relying on the server's local time.
 */
const IST_OFFSET_MIN = 330;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "2026-11-02" + "14:30" (IST) → Date (absolute instant). Returns null if invalid. */
export function istToDate(date: string, time = "00:00"): Date | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const utc = Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MIN * 60 * 1000;
  const result = new Date(utc);
  // Reject impossible dates such as 2026-02-31
  const back = istParts(result);
  if (back.date !== date) return null;
  return result;
}

/** Break an instant into IST calendar parts. */
export function istParts(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MIN * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    year: y,
    month: m,
    day,
    hour,
    minute,
    date: `${y}-${pad(m)}-${pad(day)}`,
    time: `${pad(hour)}:${pad(minute)}`,
  };
}

/** Number of calendar days from pickup date to return date, inclusive. */
export function inclusiveDays(fromDate: string, toDate: string): number {
  const a = Date.UTC(...ymd(fromDate));
  const b = Date.UTC(...ymd(toDate));
  return Math.round((b - a) / DAY_MS) + 1;
}

function ymd(s: string): [number, number, number] {
  const [y, m, d] = s.split("-").map(Number);
  return [y, m - 1, d];
}

/** Start (00:00 IST) of the IST day containing `d`. */
export function istStartOfDay(d: Date): Date {
  return istToDate(istParts(d).date)!;
}

/** Start (00:00 IST) of the IST month containing `d`. */
export function istStartOfMonth(d: Date): Date {
  const p = istParts(d);
  return istToDate(`${p.year}-${String(p.month).padStart(2, "0")}-01`)!;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** Today's date in IST as YYYY-MM-DD. */
export function istToday(now = new Date()): string {
  return istParts(now).date;
}

/** Is the given IST hour inside a window like 22 → 6 (wrapping midnight)? */
export function isHourInWindow(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}
