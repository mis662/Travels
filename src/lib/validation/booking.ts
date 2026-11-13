import { z } from "zod";
import {
  dateSchema,
  mobileSchema,
  optionalEmailSchema,
  slugSchema,
  timeSchema,
} from "./common";

/**
 * Trip search — what the home page widget produces. Kept in the URL so the
 * Select Car and Booking pages are shareable/refreshable.
 */
export const tripSearchSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("airport"),
    dir: z.enum(["pickup", "drop"], { error: "Choose pickup or drop" }),
    airport: slugSchema,
    zone: slugSchema,
    date: dateSchema,
    time: timeSchema,
  }),
  z.object({
    type: z.literal("local"),
    pkg: z.string().regex(/^\d{1,2}-\d{1,4}$/, { error: "Choose a package" }),
    from: z.string().trim().min(2, { error: "Enter your pickup area" }).max(120),
    date: dateSchema,
    time: timeSchema,
  }),
  z.object({
    type: z.literal("oneway"),
    route: slugSchema,
    date: dateSchema,
    time: timeSchema,
  }),
  z.object({
    type: z.literal("round"),
    route: slugSchema,
    date: dateSchema,
    time: timeSchema,
    ret: dateSchema,
  }),
]);
export type TripSearch = z.infer<typeof tripSearchSchema>;

export const customerDetailsSchema = z.object({
  customerName: z
    .string({ error: "Name is required" })
    .trim()
    .min(2, { error: "Enter your full name" })
    .max(80, { error: "Name is too long" }),
  customerMobile: mobileSchema,
  customerEmail: optionalEmailSchema,
  pickupAddress: z
    .string({ error: "Pickup address is required" })
    .trim()
    .min(5, { error: "Enter the full pickup address" })
    .max(300, { error: "Address is too long" }),
  dropAddress: z.string().trim().max(300, { error: "Address is too long" }).optional().default(""),
  passengers: z.coerce
    .number({ error: "Enter number of passengers" })
    .int({ error: "Enter a whole number" })
    .min(1, { error: "At least 1 passenger" })
    .max(60, { error: "Too many passengers" }),
  specialRequests: z.string().trim().max(500, { error: "Keep it under 500 characters" }).optional().default(""),
});
export type CustomerDetails = z.infer<typeof customerDetailsSchema>;

export const createBookingSchema = z.object({
  trip: tripSearchSchema,
  car: slugSchema,
  details: customerDetailsSchema,
  idempotencyKey: z.string().uuid({ error: "Invalid form session, please reload" }),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const trackBookingSchema = z.object({
  code: z
    .string({ error: "Booking ID is required" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}-\d{8}-[A-Z0-9]{4}$/, { error: "Booking ID looks like MUM-20261101-AB12" }),
  mobile: mobileSchema,
});

/** Parse URLSearchParams-like object into a TripSearch. */
export function parseTripSearch(params: Record<string, string | string[] | undefined>) {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && v[0]) flat[k] = v[0];
  }
  return tripSearchSchema.safeParse(flat);
}

export function tripSearchToQuery(trip: TripSearch): string {
  return new URLSearchParams(trip as unknown as Record<string, string>).toString();
}
