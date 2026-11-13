import { z } from "zod";
import { BOOKING_STATUSES } from "@/lib/booking/status";
import { DATE_RE } from "@/lib/time";
import { mobileSchema, slugSchema } from "./common";

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const money = (label: string) =>
  z.coerce.number({ error: `${label} must be a number` }).min(0, { error: `${label} cannot be negative` }).max(1_000_000, { error: `${label} is too large` });
const intMoney = (label: string) => money(label).int({ error: `${label} must be a whole number` });
const dateField = (label: string) => z.string().regex(DATE_RE, { error: `${label}: select a valid date` });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email" })),
  password: z.string().min(1, { error: "Enter your password" }).max(200),
});

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, { error: "Enter your current password" }),
    next: z.string().min(8, { error: "New password must be at least 8 characters" }).max(200),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { error: "Passwords do not match", path: ["confirm"] });

export const driverSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter the driver's name" }).max(80),
  phone: mobileSchema,
  licenceNumber: z.string().trim().min(5, { error: "Enter the licence number" }).max(30),
  licenceExpiry: dateField("Licence expiry"),
  policeVerification: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
  active: checkbox,
  // Empty = keep the current PIN
  pin: z.union([z.literal(""), z.string().regex(/^\d{4,6}$/, { error: "PIN must be 4 to 6 digits" })]).optional().default(""),
});

export const vehicleSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/, { error: "Registration number looks like MH02AB1234" })),
  model: z.string().trim().min(2, { error: "Enter the model" }).max(80),
  categoryId: z.string().min(1, { error: "Choose a car category" }),
  ownerName: z.string().trim().min(1, { error: "Enter owner / vendor" }).max(80),
  permitExpiry: dateField("Permit expiry"),
  insuranceExpiry: dateField("Insurance expiry"),
  active: checkbox,
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: slugSchema,
  exampleModels: z.string().trim().min(2).max(120),
  seats: z.coerce.number().int().min(1).max(60),
  luggage: z.coerce.number().int().min(0).max(60),
  ac: checkbox,
  imageUrl: z.string().trim().max(500),
  description: z.string().trim().max(300),
  perKmRate: money("Per km rate"),
  baseFare: intMoney("Base / minimum fare"),
  driverAllowancePerDay: intMoney("Driver allowance"),
  localExtraKmRate: money("Local extra km rate"),
  localExtraHourRate: intMoney("Local extra hour rate"),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: checkbox,
});

export const chargesSchema = z
  .object({
    nightCharge: intMoney("Night charge"),
    nightStartHour: z.coerce.number().int().min(0).max(23),
    nightEndHour: z.coerce.number().int().min(0).max(23),
    gstPercent: z.coerce.number().min(0).max(28),
    minKmPerDay: z.coerce.number().int().min(0).max(1000),
    oneWayMinKm: z.coerce.number().int().min(0).max(1000),
  });

export const packageSchema = z.object({
  name: z.string().trim().min(2).max(40),
  hours: z.coerce.number().int().min(1).max(24),
  km: z.coerce.number().int().min(1).max(1000),
  active: checkbox,
});

export const zoneSchema = z.object({
  name: z.string().trim().min(2).max(60),
  areas: z.string().trim().max(200),
  active: checkbox,
});

export const routeSchema = z.object({
  toCity: z.string().trim().min(2, { error: "Enter destination city" }).max(60),
  slug: slugSchema,
  distanceKm: z.coerce.number().int().min(1).max(3000),
  durationText: z.string().trim().max(40),
  description: z.string().trim().max(2000),
  seoTitle: z.string().trim().max(120),
  seoDescription: z.string().trim().max(300),
  popular: checkbox,
  active: checkbox,
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160),
  phonePrimary: z.string().trim().min(8).max(20),
  phoneSecondary: z.string().trim().max(20),
  whatsappPrimary: z.string().trim().min(8).max(20),
  whatsappSecondary: z.string().trim().max(20),
  email: z.email({ error: "Enter a valid email" }),
  address: z.string().trim().min(3).max(300),
  advanceBookingHours: z.coerce.number().int().min(0).max(168),
  cancellationCutoffHours: z.coerce.number().int().min(0).max(168),
});

export const statusChangeSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(BOOKING_STATUSES),
  note: z.string().trim().max(500).optional().default(""),
});

export const assignSchema = z.object({
  bookingId: z.string().min(1),
  driverId: z.string().min(1, { error: "Select a driver" }),
  vehicleId: z.string().min(1, { error: "Select a vehicle" }),
});

export const finalFareSchema = z.object({
  bookingId: z.string().min(1),
  finalFare: z.union([z.literal(""), intMoney("Final fare")]),
});

export const noteSchema = z.object({
  bookingId: z.string().min(1),
  body: z.string().trim().min(1, { error: "Write a note" }).max(1000),
});

export const cancelSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().trim().min(3, { error: "Enter a cancellation reason" }).max(500),
});
