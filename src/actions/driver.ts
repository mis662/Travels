"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { driverSignupSchema } from "@/lib/validation/account";
import { istToDate } from "@/lib/time";
import { createDriverSession, destroyDriverSession, requireDriver } from "@/lib/auth/driver-session";
import { BookingActionError, driverUpdateRide } from "@/lib/services/booking";
import { mobileSchema } from "@/lib/validation/common";
import { firstError, formObject, type ActionState } from "@/lib/action-state";
import { clientIp, recordFailure, tooManyFailures } from "@/lib/rate-limit";

const loginSchema = z.object({
  phone: mobileSchema,
  pin: z.string().regex(/^\d{4,6}$/, { error: "PIN is 4 to 6 digits" }),
  next: z.string().optional(),
});

export async function driverLoginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { phone, pin, next } = parsed.data;

  const keys = [`driver-login:${await clientIp()}`, `driver-login:${phone}`];
  if (keys.some((k) => tooManyFailures(k, 8))) {
    return { error: "Too many wrong attempts. Try again in 15 minutes." };
  }

  const candidates = await prisma.driver.findMany({ where: { phone, pinHash: { not: null } } });
  let match: (typeof candidates)[number] | null = null;
  for (const d of candidates) {
    if (await verifyPassword(pin, d.pinHash!)) {
      match = d;
      break;
    }
  }
  if (!match) {
    keys.forEach((k) => recordFailure(k, 15 * 60_000));
    return { error: "Wrong mobile number or PIN." };
  }
  if (!match.approved) return { error: "Your account is waiting for approval by the office. Please try again later." };
  if (!match.active) return { error: "Your account is inactive. Please contact the office." };

  await createDriverSession(match.id);
  // Only allow redirects inside the driver app
  redirect(next && /^\/driver\/trips\/[\w-]+$/.test(next) ? next : "/driver");
}

/** Self sign-up: the account is created as "pending" and can't log in until an admin approves it. */
export async function driverSignupAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  // Count only registrations actually created, not typos/retries
  const signupKey = `driver-signups-created:${await clientIp()}`;
  if (tooManyFailures(signupKey, 10)) {
    return { error: "Too many registrations from this network. Please try again in an hour." };
  }
  const parsed = driverSignupSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { name, phone, licenceNumber, licenceExpiry, pin } = parsed.data;

  if (await prisma.driver.findFirst({ where: { phone } })) {
    return { error: "A driver with this mobile number is already registered. Please sign in, or call the office." };
  }
  await prisma.driver.create({
    data: {
      name,
      phone,
      licenceNumber,
      licenceExpiry: istToDate(licenceExpiry)!,
      policeVerification: "PENDING",
      pinHash: await hashPassword(pin),
      approved: false,
      active: false,
    },
  });
  recordFailure(signupKey, 60 * 60_000); // counts a created registration
  revalidatePath("/admin/drivers");
  return { ok: true, message: "Registration received! The office will verify your documents and approve your account. You can sign in after approval." };
}

export async function driverLogoutAction() {
  await destroyDriverSession();
  redirect("/driver/login");
}

const rideSchema = z.object({
  bookingId: z.string().min(1),
  action: z.enum(["start", "complete"]),
});

export async function rideAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const driver = await requireDriver();
  const parsed = rideSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { bookingId, action } = parsed.data;
  try {
    await driverUpdateRide(bookingId, driver, action);
  } catch (e) {
    if (e instanceof BookingActionError) return { error: e.message };
    throw e;
  }
  revalidatePath("/driver");
  revalidatePath(`/driver/trips/${bookingId}`);
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { ok: true, message: action === "start" ? "Ride started. Have a safe trip!" : "Ride completed. Thank you!" };
}
