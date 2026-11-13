"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createBooking } from "@/lib/services/booking";
import { getCurrentCustomer } from "@/lib/auth/customer-session";
import { parseRecentBookings, RECENT_BOOKINGS_COOKIE } from "@/lib/booking/cookies";

export type CreateBookingActionResult = { errors: Record<string, string> } | undefined;

/** Called from the booking form with a plain object (already validated client-side, re-validated here). */
export async function createBookingAction(payload: unknown): Promise<CreateBookingActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { errors: { _form: "Your session has expired. Please sign in again to confirm the booking." } };

  let code: string;
  try {
    const res = await createBooking(payload, new Date(), { customerId: customer.id });
    if (!res.ok) return { errors: res.errors };
    code = res.code;
  } catch (err) {
    console.error("[booking] create failed", err);
    return { errors: { _form: "Something went wrong while saving your booking. Please try again or call us." } };
  }

  // Remember bookings made from this browser so the confirmation page can show full details.
  const jar = await cookies();
  const existing = parseRecentBookings(jar.get(RECENT_BOOKINGS_COOKIE)?.value);
  const codes = [code, ...existing.filter((c) => c !== code)].slice(0, 10);
  jar.set(RECENT_BOOKINGS_COOKIE, codes.join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(`/booking/${code}`);
}
