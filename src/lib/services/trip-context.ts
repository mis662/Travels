import type { Setting } from "@prisma/client";
import { checkTripTiming, type TimingResult } from "@/lib/booking/rules";
import { parseTripSearch } from "@/lib/validation/booking";
import { getSettings } from "./settings";
import { resolveTrip, type ResolvedTrip } from "./pricing";

export type TripContext =
  | { ok: true; trip: ResolvedTrip; timing: TimingResult; settings: Setting }
  | { ok: false; message: string; settings: Setting; raw: Record<string, string> };

/** Parse + validate + resolve the trip described by page search params. */
export async function loadTripContext(params: Record<string, string | string[] | undefined>): Promise<TripContext> {
  const settings = await getSettings();
  const raw = Object.fromEntries(Object.entries(params).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = parseTripSearch(params);
  if (!parsed.success) return { ok: false, message: "Please fill in your trip details.", settings, raw };

  const timing = checkTripTiming(parsed.data, settings.advanceBookingHours);
  if (!timing.ok) return { ok: false, message: Object.values(timing.errors)[0], settings, raw };

  const trip = await resolveTrip(parsed.data);
  if (!trip) return { ok: false, message: "That pickup/destination is not available. Please choose again.", settings, raw };

  return { ok: true, trip, timing, settings };
}
