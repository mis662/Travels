import { describe, expect, it } from "vitest";
import { calculateFare, FareError, type CategoryRates, type PricingSettings } from "@/lib/fare/engine";

const settings: PricingSettings = {
  nightCharge: 300,
  nightStartHour: 22,
  nightEndHour: 6,
  gstPercent: 5,
  minKmPerDay: 250,
  oneWayMinKm: 150,
};

const sedan: CategoryRates = {
  perKmRate: 12,
  baseFare: 2500,
  driverAllowancePerDay: 300,
  localExtraKmRate: 13,
  localExtraHourRate: 140,
};

describe("airport fare", () => {
  it("uses the fixed zone fare plus GST", () => {
    const f = calculateFare({ tripType: "AIRPORT", airportFare: 800, pickupHour: 10 }, sedan, settings);
    expect(f.subtotal).toBe(800);
    expect(f.gstAmount).toBe(40);
    expect(f.total).toBe(840);
    expect(f.extras.join(" ")).toMatch(/Toll, parking & state tax/);
  });

  it("throws when the fare is not configured", () => {
    expect(() => calculateFare({ tripType: "AIRPORT", airportFare: 0, pickupHour: 10 }, sedan, settings)).toThrow(FareError);
  });
});

describe("local rental fare", () => {
  it("uses the package price and lists extra km / hour rates", () => {
    const f = calculateFare(
      { tripType: "LOCAL", packagePrice: 2200, packageHours: 8, packageKm: 80, pickupHour: 9 },
      sedan,
      settings,
    );
    expect(f.subtotal).toBe(2200);
    expect(f.total).toBe(2310);
    expect(f.extras).toContain("Extra km: ₹13/km");
    expect(f.extras).toContain("Extra hour: ₹140/hr");
  });
});

describe("outstation one way", () => {
  it("charges distance × rate when above minimums", () => {
    // Shirdi 240 km × 12 = 2880 (> min fare 2500)
    const f = calculateFare({ tripType: "OUTSTATION_ONE_WAY", distanceKm: 240, pickupHour: 7 }, sedan, settings);
    expect(f.chargeableKm).toBe(240);
    expect(f.subtotal).toBe(2880);
    expect(f.gstAmount).toBe(144);
    expect(f.total).toBe(3024);
  });

  it("applies the one-way minimum km", () => {
    // Lonavala 83 km → 150 km minimum × 11 = 1650, below hatchback min fare 2000
    const hatch = { ...sedan, perKmRate: 11, baseFare: 2000 };
    const f = calculateFare({ tripType: "OUTSTATION_ONE_WAY", distanceKm: 83, pickupHour: 7 }, hatch, settings);
    expect(f.chargeableKm).toBe(150);
    expect(f.lines[0].amount).toBe(1650);
    expect(f.lines.find((l) => l.label === "Minimum fare adjustment")?.amount).toBe(350);
    expect(f.subtotal).toBe(2000);
  });
});

describe("outstation round trip", () => {
  it("uses 250 km/day minimum when actual km is lower", () => {
    // Lonavala 83 × 2 = 166 km, 2 days → max(166, 500) = 500 km
    const f = calculateFare({ tripType: "OUTSTATION_ROUND_TRIP", distanceKm: 83, days: 2, pickupHour: 8 }, sedan, settings);
    expect(f.chargeableKm).toBe(500);
    expect(f.lines[0].amount).toBe(6000);
    expect(f.lines[1]).toMatchObject({ label: "Driver allowance", amount: 600 });
    expect(f.subtotal).toBe(6600);
    expect(f.total).toBe(6930);
  });

  it("uses actual km when it exceeds the minimum", () => {
    // Goa 590 × 2 = 1180 km over 3 days (min 750) → 1180 km
    const f = calculateFare({ tripType: "OUTSTATION_ROUND_TRIP", distanceKm: 590, days: 3, pickupHour: 6 }, sedan, settings);
    expect(f.chargeableKm).toBe(1180);
    expect(f.subtotal).toBe(1180 * 12 + 900);
  });

  it("rejects invalid day counts", () => {
    expect(() =>
      calculateFare({ tripType: "OUTSTATION_ROUND_TRIP", distanceKm: 100, days: 0, pickupHour: 8 }, sedan, settings),
    ).toThrow(FareError);
  });
});

describe("night charge", () => {
  it.each([
    [22, true],
    [23, true],
    [0, true],
    [5, true],
    [6, false],
    [21, false],
    [12, false],
  ])("pickup hour %i → night charge %s", (hour, expected) => {
    const f = calculateFare({ tripType: "AIRPORT", airportFare: 1000, pickupHour: hour }, sedan, settings);
    expect(f.lines.some((l) => l.label === "Night charge")).toBe(expected);
    expect(f.subtotal).toBe(expected ? 1300 : 1000);
  });

  it("is skipped when configured as 0", () => {
    const f = calculateFare({ tripType: "AIRPORT", airportFare: 1000, pickupHour: 23 }, sedan, { ...settings, nightCharge: 0 });
    expect(f.subtotal).toBe(1000);
  });
});

describe("GST", () => {
  it("rounds GST to the nearest rupee and respects the configured percentage", () => {
    const f = calculateFare({ tripType: "AIRPORT", airportFare: 999, pickupHour: 10 }, sedan, { ...settings, gstPercent: 12 });
    expect(f.gstAmount).toBe(120); // 119.88
    expect(f.total).toBe(1119);
  });

  it("supports 0% GST", () => {
    const f = calculateFare({ tripType: "AIRPORT", airportFare: 999, pickupHour: 10 }, sedan, { ...settings, gstPercent: 0 });
    expect(f.total).toBe(999);
  });
});
