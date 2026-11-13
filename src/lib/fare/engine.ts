/**
 * Pure fare engine — no database access, so it can be unit tested and reused
 * by any caller (booking flow, admin preview, future payment step).
 * All amounts are whole rupees.
 */
import { isHourInWindow } from "@/lib/time";

export interface PricingSettings {
  nightCharge: number;
  nightStartHour: number;
  nightEndHour: number;
  gstPercent: number;
  minKmPerDay: number;
  oneWayMinKm: number;
}

export interface CategoryRates {
  perKmRate: number;
  baseFare: number; // minimum fare for outstation trips
  driverAllowancePerDay: number;
  localExtraKmRate: number;
  localExtraHourRate: number;
}

export type TripFareInput =
  | { tripType: "AIRPORT"; airportFare: number }
  | { tripType: "LOCAL"; packagePrice: number; packageHours: number; packageKm: number }
  | { tripType: "OUTSTATION_ONE_WAY"; distanceKm: number }
  | { tripType: "OUTSTATION_ROUND_TRIP"; distanceKm: number; days: number };

export type FareRequest = TripFareInput & {
  /** Pickup hour in IST, 0–23 (used for the night charge). */
  pickupHour: number;
};

export interface FareLine {
  label: string;
  amount: number;
  detail?: string;
}

export interface FareBreakdown {
  lines: FareLine[];
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  chargeableKm?: number;
  /** Shown to the customer as "included" points. */
  inclusions: string[];
  /** Charged extra after the trip. */
  extras: string[];
}

export class FareError extends Error {}

const r = (n: number) => Math.round(n);
const rate = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function calculateFare(
  req: FareRequest,
  cat: CategoryRates,
  s: PricingSettings,
): FareBreakdown {
  const lines: FareLine[] = [];
  const inclusions: string[] = [];
  const extras: string[] = ["Toll, parking & state tax: extra as actual"];
  let chargeableKm: number | undefined;

  switch (req.tripType) {
    case "AIRPORT": {
      if (!(req.airportFare > 0)) throw new FareError("Airport fare not configured");
      lines.push({ label: "Airport transfer (fixed fare)", amount: r(req.airportFare) });
      inclusions.push("Fixed fare for your zone", "Fuel & driver charges included");
      extras.push("Airport parking / entry fee: extra as actual");
      break;
    }
    case "LOCAL": {
      if (!(req.packagePrice > 0)) throw new FareError("Local package fare not configured");
      lines.push({
        label: `Local package ${req.packageHours} hr / ${req.packageKm} km`,
        amount: r(req.packagePrice),
      });
      inclusions.push(`${req.packageHours} hours and ${req.packageKm} km included`);
      extras.push(
        `Extra km: ₹${rate(cat.localExtraKmRate)}/km`,
        `Extra hour: ₹${cat.localExtraHourRate}/hr`,
      );
      break;
    }
    case "OUTSTATION_ONE_WAY": {
      assertDistance(req.distanceKm);
      chargeableKm = Math.max(req.distanceKm, s.oneWayMinKm);
      const kmFare = chargeableKm * cat.perKmRate;
      lines.push({
        label: "Distance fare",
        amount: r(kmFare),
        detail: `${chargeableKm} km × ₹${rate(cat.perKmRate)}/km` +
          (chargeableKm > req.distanceKm ? ` (minimum ${s.oneWayMinKm} km)` : ""),
      });
      addMinimumFareAdjustment(lines, kmFare, cat.baseFare);
      inclusions.push(`${chargeableKm} km included`, "Driver charges included");
      extras.push(`Extra km beyond ${chargeableKm} km: ₹${rate(cat.perKmRate)}/km`);
      break;
    }
    case "OUTSTATION_ROUND_TRIP": {
      assertDistance(req.distanceKm);
      if (!Number.isInteger(req.days) || req.days < 1) throw new FareError("Invalid number of days");
      const actualKm = req.distanceKm * 2;
      const minKm = s.minKmPerDay * req.days;
      chargeableKm = Math.max(actualKm, minKm);
      const kmFare = chargeableKm * cat.perKmRate;
      lines.push({
        label: "Distance fare",
        amount: r(kmFare),
        detail:
          `${chargeableKm} km × ₹${rate(cat.perKmRate)}/km` +
          (minKm > actualKm ? ` (minimum ${s.minKmPerDay} km/day × ${req.days} day${req.days > 1 ? "s" : ""})` : ""),
      });
      const allowance = cat.driverAllowancePerDay * req.days;
      lines.push({
        label: "Driver allowance",
        amount: r(allowance),
        detail: `₹${cat.driverAllowancePerDay} × ${req.days} day${req.days > 1 ? "s" : ""}`,
      });
      addMinimumFareAdjustment(lines, kmFare + allowance, cat.baseFare);
      inclusions.push(`${chargeableKm} km included`, `Driver allowance for ${req.days} day${req.days > 1 ? "s" : ""}`);
      extras.push(`Extra km beyond ${chargeableKm} km: ₹${rate(cat.perKmRate)}/km`);
      break;
    }
    default:
      throw new FareError("Unknown trip type");
  }

  if (s.nightCharge > 0 && isHourInWindow(req.pickupHour, s.nightStartHour, s.nightEndHour)) {
    lines.push({
      label: "Night charge",
      amount: r(s.nightCharge),
      detail: `Pickup between ${hourLabel(s.nightStartHour)} and ${hourLabel(s.nightEndHour)}`,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const gstAmount = r((subtotal * s.gstPercent) / 100);

  return {
    lines,
    subtotal,
    gstPercent: s.gstPercent,
    gstAmount,
    total: subtotal + gstAmount,
    chargeableKm,
    inclusions,
    extras,
  };
}

function assertDistance(km: number) {
  if (!(km > 0)) throw new FareError("Route distance not configured");
}

function addMinimumFareAdjustment(lines: FareLine[], fareSoFar: number, minimumFare: number) {
  if (minimumFare > 0 && fareSoFar < minimumFare) {
    lines.push({
      label: "Minimum fare adjustment",
      amount: r(minimumFare - fareSoFar),
      detail: `Minimum outstation fare ₹${minimumFare}`,
    });
  }
}

export function hourLabel(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${suffix}`;
}
