"use server";

import { z } from "zod";
import { trackBookingSchema } from "@/lib/validation/booking";
import { fieldErrors } from "@/lib/validation/common";
import { BookingActionError, cancelByCustomer, findCustomerBooking } from "@/lib/services/booking";
import { getSettings } from "@/lib/services/settings";
import { canCustomerCancel } from "@/lib/booking/status";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { FareBreakdown } from "@/lib/fare/engine";

export interface TrackedBooking {
  code: string;
  mobile: string;
  status: string;
  tripType: string;
  pickupAt: string;
  returnAt: string | null;
  pickupLocation: string;
  dropLocation: string;
  pickupAddress: string;
  dropAddress: string;
  passengers: number;
  car: string;
  estimatedFare: number;
  finalFare: number | null;
  fare: FareBreakdown;
  driver: { name: string; phone: string } | null;
  vehicle: { model: string; registrationNumber: string } | null;
  history: { toStatus: string; at: string; note: string }[];
  cancelReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  canCancel: boolean;
  cancelCutoffHours: number;
}

export type TrackState = {
  errors?: Record<string, string>;
  booking?: TrackedBooking;
  message?: string;
  /** Echo of the lookup form so inputs keep their values after React resets the form. */
  values?: { code: string; mobile: string };
};

async function view(code: string, mobile: string): Promise<TrackedBooking | null> {
  const b = await findCustomerBooking(code, mobile);
  if (!b) return null;
  const s = await getSettings();
  const showDriver = ["DRIVER_ASSIGNED", "ONGOING"].includes(b.status);
  return {
    code: b.code,
    mobile: b.customerMobile,
    status: b.status,
    tripType: b.tripType,
    pickupAt: b.pickupAt.toISOString(),
    returnAt: b.returnAt?.toISOString() ?? null,
    pickupLocation: b.pickupLocation,
    dropLocation: b.dropLocation,
    pickupAddress: b.pickupAddress,
    dropAddress: b.dropAddress,
    passengers: b.passengers,
    car: `${b.category.name} (${b.category.exampleModels})`,
    estimatedFare: b.estimatedFare,
    finalFare: b.finalFare,
    fare: JSON.parse(b.fareBreakdown),
    driver: showDriver && b.driver ? { name: b.driver.name, phone: b.driver.phone } : null,
    vehicle: showDriver && b.vehicle ? { model: b.vehicle.model, registrationNumber: b.vehicle.registrationNumber } : null,
    history: b.history.map((h) => ({ toStatus: h.toStatus, at: h.createdAt.toISOString(), note: h.changedBy === "customer" ? h.note : "" })),
    cancelReason: b.cancelReason,
    startedAt: b.startedAt?.toISOString() ?? null,
    completedAt: b.completedAt?.toISOString() ?? null,
    canCancel: canCustomerCancel(b.status, b.pickupAt, s.cancellationCutoffHours),
    cancelCutoffHours: s.cancellationCutoffHours,
  };
}

/** Single entry point for the Track page: intent = "track" | "cancel". */
export async function manageBookingAction(prev: TrackState, formData: FormData): Promise<TrackState> {
  const intent = formData.get("intent");
  if (intent === "cancel") return cancelBooking(formData);
  if (intent === "refresh") {
    // A failed background refresh must never blank out the booking on screen
    const next = await trackBooking(formData, true);
    return next.booking ? { ...next, message: prev.message } : prev;
  }
  return trackBooking(formData);
}

/** `refresh` = automatic polling from an open Track page; it has its own, higher rate limit. */
async function trackBooking(formData: FormData, refresh = false): Promise<TrackState> {
  const values = { code: String(formData.get("code") ?? "").slice(0, 30), mobile: String(formData.get("mobile") ?? "").slice(0, 20) };
  const limited = refresh
    ? !rateLimit(`track-refresh:${await clientIp()}`, 60, 10 * 60_000)
    : !rateLimit(`track:${await clientIp()}`, 20, 10 * 60_000);
  if (limited) {
    return { values, errors: { _form: "Too many attempts. Please try again in a few minutes." } };
  }
  const parsed = trackBookingSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };
  const booking = await view(parsed.data.code, parsed.data.mobile);
  if (!booking) return { values, errors: { _form: "No booking found with this Booking ID and mobile number." } };
  return { values, booking };
}

const cancelSchema = trackBookingSchema.extend({ reason: z.string().trim().max(300).optional().default("") });

async function cancelBooking(formData: FormData): Promise<TrackState> {
  if (!rateLimit(`cancel:${await clientIp()}`, 10, 10 * 60_000)) {
    return { errors: { _form: "Too many attempts. Please try again later." } };
  }
  const parsed = cancelSchema.safeParse({
    code: formData.get("code"),
    mobile: formData.get("mobile"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { code, mobile } = parsed.data;
  try {
    await cancelByCustomer(code, mobile, parsed.data.reason);
  } catch (e) {
    if (e instanceof BookingActionError) {
      return { values: { code, mobile }, booking: (await view(code, mobile)) ?? undefined, errors: { _form: e.message } };
    }
    throw e;
  }
  return { values: { code, mobile }, booking: (await view(code, mobile)) ?? undefined, message: "Your booking has been cancelled." };
}
