/**
 * Corporate (B2B) bookings.
 * A company books one or more cars (trip-wise, day-wise or monthly) and decides which
 * employees ride together in each car. A sub-admin assigns a driver per car, which creates
 * one duty (a normal Booking, tripType CORPORATE) per day — so the driver app,
 * Start/Complete and tracking work like retail bookings.
 */
import { z } from "zod";
import { DATE_RE, inclusiveDays, istParts, istToDate, TIME_RE } from "@/lib/time";
import { mobileSchema } from "@/lib/validation/common";

export const ORDER_TYPES = ["TRIP", "DAILY", "MONTHLY"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  TRIP: "Single trip",
  DAILY: "Day-wise",
  MONTHLY: "Monthly",
};

export const CORP_TRIP_TYPES = ["AIRPORT", "LOCAL", "OUTSTATION", "COMPANY_ROUTE"] as const;
export type CorpTripType = (typeof CORP_TRIP_TYPES)[number];
export const CORP_TRIP_LABELS: Record<CorpTripType, string> = {
  AIRPORT: "Airport",
  LOCAL: "Local",
  OUTSTATION: "Outstation",
  COMPANY_ROUTE: "Our route",
};

export const ORDER_STATUSES = ["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export const RATE_UNITS = ["PER_TRIP", "PER_DAY", "PER_MONTH"] as const;
export const RATE_UNIT_LABELS: Record<(typeof RATE_UNITS)[number], string> = {
  PER_TRIP: "per trip",
  PER_DAY: "per day",
  PER_MONTH: "per month",
};

export const MAX_DUTIES_PER_CAR = 62;
export const MAX_CARS_PER_ORDER = 50;

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

const carsSchema = z
  .string({ error: "Add at least one car" })
  .transform((s, ctx) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid car list" });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(
        z.object({
          categoryId: z.string().min(1, { error: "Choose a car type for every car" }),
          employeeIds: z.array(z.string().min(1)).min(1, { error: "Choose at least one employee for every car" }),
        }),
      )
      .min(1, { error: "Add at least one car" })
      .max(MAX_CARS_PER_ORDER, { error: `At most ${MAX_CARS_PER_ORDER} cars per booking` }),
  );

/** What a company submits from the "Book cars" page. */
export const companyOrderSchema = z
  .object({
    tripType: z.enum(CORP_TRIP_TYPES, { error: "Choose Airport, Local, Outstation or Our route" }),
    orderType: z.enum(ORDER_TYPES, { error: "Choose single trip, day-wise or monthly" }),
    startDate: z.string().regex(DATE_RE, { error: "Select the date" }),
    endDate: z.string().optional().default(""),
    reportingTime: z.string().regex(TIME_RE, { error: "Select the pickup time" }),
    skipSundays: checkbox,
    airportSlug: z.string().optional().default(""),
    airportDirection: z.enum(["PICKUP", "DROP"]).optional(),
    packageCode: z.string().optional().default(""),
    routeSlug: z.string().optional().default(""),
    roundTrip: checkbox,
    companyRouteId: z.string().optional().default(""),
    requirements: z.string().trim().max(1000).optional().default(""),
    cars: carsSchema,
  })
  .transform((d) => ({ ...d, endDate: d.orderType === "TRIP" || !d.endDate ? d.startDate : d.endDate }))
  .refine((d) => d.endDate >= d.startDate, { error: "End date must be on or after the start date", path: ["endDate"] })
  .refine((d) => inclusiveDays(d.startDate, d.endDate) <= 366, { error: "A booking can cover at most one year", path: ["endDate"] })
  .refine((d) => d.tripType !== "AIRPORT" || (d.airportSlug && d.airportDirection), { error: "Choose the airport and pickup/drop", path: ["airportSlug"] })
  .refine((d) => d.tripType !== "LOCAL" || d.packageCode, { error: "Choose a local package", path: ["packageCode"] })
  .refine((d) => d.tripType !== "OUTSTATION" || d.routeSlug, { error: "Choose the outstation destination", path: ["routeSlug"] })
  .refine((d) => d.tripType !== "COMPANY_ROUTE" || d.companyRouteId, { error: "Choose one of your routes", path: ["companyRouteId"] })
  .refine((d) => new Set(d.cars.flatMap((c) => c.employeeIds)).size === d.cars.flatMap((c) => c.employeeIds).length, {
    error: "An employee can ride in only one car per booking",
    path: ["cars"],
  });
export type CompanyOrderInput = z.infer<typeof companyOrderSchema>;

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const employeeSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter the employee's name" }).max(80),
  employeeCode: optionalText(30),
  mobile: mobileSchema,
  email: z.union([z.literal(""), z.email({ error: "Enter a valid email" })]).optional().default(""),
  gender: z.enum(["", "Male", "Female", "Other"]).optional().default(""),
  department: optionalText(60),
  homeAddress: z.string().trim().min(5, { error: "Enter the home address (pickup location)" }).max(300),
  homeArea: optionalText(80),
  homeLandmark: optionalText(120),
  homeMapLink: optionalText(500),
  // Required when creating; optional when editing (blank = keep)
  password: z.union([z.literal(""), z.string().min(8, { error: "Password must be at least 8 characters" }).max(200)]).optional().default(""),
  active: checkbox,
});

export const companyRouteSchema = z.object({
  name: z.string().trim().min(2, { error: "Name the route, e.g. Andheri → Office" }).max(80),
  fromPlace: z.string().trim().min(2, { error: "Enter where the route starts" }).max(200),
  toPlace: z.string().trim().min(2, { error: "Enter where the route ends" }).max(200),
  distanceKm: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(1).max(3000).optional()),
  notes: optionalText(300),
  active: checkbox,
});

export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, { error: "Enter your current password" }),
    next: z.string().min(8, { error: "New password must be at least 8 characters" }).max(200),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { error: "Passwords do not match", path: ["confirm"] })
  .refine((d) => d.next !== d.current, { error: "Choose a password different from the current one", path: ["next"] });

/** Every IST date from `from` to `to` inclusive, optionally skipping Sundays. */
export function dutyDates(from: string, to: string, skipSundays = false): string[] {
  const out: string[] = [];
  const start = istToDate(from);
  const end = istToDate(to);
  if (!start || !end || end < start) return out;
  for (let t = start.getTime(); t <= end.getTime(); t += 86400_000) {
    const d = new Date(t);
    // The instant is IST midnight, so shifting by +5:30 gives the IST weekday in UTC fields
    const weekday = new Date(t + 330 * 60_000).getUTCDay();
    if (skipSundays && weekday === 0) continue;
    out.push(istParts(d).date);
  }
  return out;
}

/** Duty amount from the agreed rate: per-trip/per-day rates apply to each duty; monthly rates are billed separately. */
export function dutyAmount(rate: number | null | undefined, rateUnit: string): number {
  if (!rate) return 0;
  return rateUnit === "PER_TRIP" || rateUnit === "PER_DAY" ? rate : 0;
}

/** A Google Maps link for an employee's home: their own link if given, otherwise a search for the address. */
export function homeMapUrl(e: { homeMapLink: string; homeAddress: string; homeArea?: string }) {
  const link = e.homeMapLink.trim();
  if (/^https?:\/\//i.test(link)) return link;
  const q = link || [e.homeAddress, e.homeArea].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function orderTypeLabel(t: string) {
  return ORDER_TYPE_LABELS[t as OrderType] ?? t;
}
export function orderStatusLabel(s: string) {
  return ORDER_STATUS_LABELS[s as OrderStatus] ?? s;
}
export function corpTripLabel(t: string) {
  return CORP_TRIP_LABELS[t as CorpTripType] ?? t;
}
