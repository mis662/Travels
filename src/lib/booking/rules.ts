/**
 * Business rules shared by the client form and the server. Pure functions so
 * they are easy to unit test.
 */
import { inclusiveDays, istToDate } from "@/lib/time";
import type { TripSearch } from "@/lib/validation/booking";

export const MAX_TRIP_DAYS = 30;

export interface TimingResult {
  ok: boolean;
  errors: Record<string, string>;
  pickupAt?: Date;
  returnAt?: Date;
  days: number;
}

/**
 * - pickup must be a valid date/time, not in the past and at least
 *   `advanceHours` from now
 * - for round trips the return date must not be before the pickup date
 *   (same-day return is allowed for day trips)
 */
export function checkTripTiming(trip: TripSearch, advanceHours: number, now = new Date()): TimingResult {
  const errors: Record<string, string> = {};
  const pickupAt = istToDate(trip.date, trip.time);
  let returnAt: Date | undefined;
  let days = 1;

  if (!pickupAt) {
    errors.date = "Select a valid pickup date and time";
  } else if (pickupAt.getTime() <= now.getTime()) {
    errors.time = "Pickup time cannot be in the past";
  } else if (pickupAt.getTime() < now.getTime() + advanceHours * 3600_000) {
    errors.time = `Please book at least ${advanceHours} hour${advanceHours === 1 ? "" : "s"} in advance`;
  }

  if (trip.type === "round") {
    const ret = istToDate(trip.ret, "23:59");
    if (!ret) {
      errors.ret = "Select a valid return date";
    } else if (pickupAt && trip.ret < trip.date) {
      errors.ret = "Return date must be on or after the pickup date";
    } else {
      days = inclusiveDays(trip.date, trip.ret);
      if (days > MAX_TRIP_DAYS) errors.ret = `Round trips can be booked for up to ${MAX_TRIP_DAYS} days online`;
      returnAt = ret;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, pickupAt: pickupAt ?? undefined, returnAt, days };
}

export function checkPassengers(passengers: number, seats: number): string | null {
  if (passengers > seats) {
    return `This car seats up to ${seats} passenger${seats === 1 ? "" : "s"}. Choose a bigger car.`;
  }
  return null;
}

/** Window in which an identical booking (same mobile, car, pickup time) is treated as a duplicate. */
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
