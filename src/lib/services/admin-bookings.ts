import type { Prisma } from "@prisma/client";
import { isBookingStatus, TRIP_TYPES } from "@/lib/booking/status";
import { addDays, istToDate } from "@/lib/time";

export interface BookingFilters {
  q?: string;
  status?: string;
  tripType?: string;
  categoryId?: string;
  from?: string; // pickup date from (YYYY-MM-DD, IST)
  to?: string;
  page?: string;
}

export function readFilters(sp: Record<string, string | string[] | undefined>): BookingFilters {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined) || undefined;
  return { q: get("q"), status: get("status"), tripType: get("tripType"), categoryId: get("categoryId"), from: get("from"), to: get("to"), page: get("page") };
}

export function bookingWhere(f: BookingFilters): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};
  if (f.q) {
    const q = f.q.slice(0, 60);
    where.OR = [
      { code: { contains: q.toUpperCase() } },
      { customerName: { contains: q } },
      { customerMobile: { contains: q.replace(/\D/g, "") || q } },
      { customerEmail: { contains: q.toLowerCase() } },
    ];
  }
  if (f.status && isBookingStatus(f.status)) where.status = f.status;
  if (f.tripType && (TRIP_TYPES as readonly string[]).includes(f.tripType)) where.tripType = f.tripType;
  if (f.categoryId) where.categoryId = f.categoryId;
  const from = f.from ? istToDate(f.from) : null;
  const to = f.to ? istToDate(f.to) : null;
  if (from || to) {
    where.pickupAt = {};
    if (from) where.pickupAt.gte = from;
    if (to) where.pickupAt.lt = addDays(to, 1);
  }
  return where;
}

export function filtersToQuery(f: BookingFilters, overrides: Partial<BookingFilters> = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...overrides })) if (v) params.set(k, v);
  return params.toString();
}

export function csvEscape(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
