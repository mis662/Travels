import { describe, expect, it } from "vitest";
import { checkPassengers, checkTripTiming } from "@/lib/booking/rules";
import { BOOKING_CODE_RE, generateBookingCode } from "@/lib/booking/code";
import { canCustomerCancel, canTransition } from "@/lib/booking/status";
import { customerDetailsSchema, parseTripSearch, trackBookingSchema } from "@/lib/validation/booking";
import { normalizeMobile } from "@/lib/validation/common";
import { inclusiveDays, istParts, istToDate } from "@/lib/time";

// 2026-11-01 10:00 IST
const NOW = istToDate("2026-11-01", "10:00")!;

describe("IST time helpers", () => {
  it("converts IST to UTC correctly", () => {
    expect(istToDate("2026-11-01", "10:00")!.toISOString()).toBe("2026-11-01T04:30:00.000Z");
    expect(istParts(new Date("2026-11-01T20:00:00Z"))).toMatchObject({ date: "2026-11-02", hour: 1, minute: 30 });
  });

  it("rejects impossible dates", () => {
    expect(istToDate("2026-02-31", "10:00")).toBeNull();
    expect(istToDate("2026-11-01", "25:00")).toBeNull();
  });

  it("counts inclusive days", () => {
    expect(inclusiveDays("2026-11-01", "2026-11-01")).toBe(1);
    expect(inclusiveDays("2026-11-01", "2026-11-03")).toBe(3);
    expect(inclusiveDays("2026-12-31", "2027-01-01")).toBe(2);
  });
});

describe("trip timing rules", () => {
  const base = { type: "oneway" as const, route: "mumbai-to-pune" };

  it("rejects past pickups", () => {
    const r = checkTripTiming({ ...base, date: "2026-11-01", time: "09:00" }, 2, NOW);
    expect(r.ok).toBe(false);
    expect(r.errors.time).toMatch(/past/);
  });

  it("enforces minimum advance booking", () => {
    const r = checkTripTiming({ ...base, date: "2026-11-01", time: "11:30" }, 2, NOW);
    expect(r.ok).toBe(false);
    expect(r.errors.time).toMatch(/2 hours in advance/);
  });

  it("accepts a pickup exactly at the advance limit", () => {
    expect(checkTripTiming({ ...base, date: "2026-11-01", time: "12:00" }, 2, NOW).ok).toBe(true);
  });

  it("respects a configurable advance window", () => {
    expect(checkTripTiming({ ...base, date: "2026-11-01", time: "14:00" }, 6, NOW).ok).toBe(false);
  });

  it("rejects return before pickup and computes days", () => {
    const bad = checkTripTiming(
      { type: "round", route: "mumbai-to-goa", date: "2026-11-05", time: "06:00", ret: "2026-11-04" },
      2,
      NOW,
    );
    expect(bad.errors.ret).toMatch(/on or after/);

    const good = checkTripTiming(
      { type: "round", route: "mumbai-to-goa", date: "2026-11-05", time: "06:00", ret: "2026-11-08" },
      2,
      NOW,
    );
    expect(good.ok).toBe(true);
    expect(good.days).toBe(4);
    expect(good.returnAt!.getTime()).toBeGreaterThan(good.pickupAt!.getTime());
  });

  it("allows a same-day round trip", () => {
    const r = checkTripTiming(
      { type: "round", route: "mumbai-to-lonavala", date: "2026-11-05", time: "06:00", ret: "2026-11-05" },
      2,
      NOW,
    );
    expect(r.ok).toBe(true);
    expect(r.days).toBe(1);
  });
});

describe("passenger rule", () => {
  it("blocks more passengers than seats", () => {
    expect(checkPassengers(5, 4)).toMatch(/up to 4/);
    expect(checkPassengers(4, 4)).toBeNull();
  });
});

describe("customer details schema", () => {
  const valid = {
    customerName: "Asha Mehta",
    customerMobile: "+91 98200 12345",
    customerEmail: "",
    pickupAddress: "12 Hill Road, Bandra West",
    dropAddress: "",
    passengers: "3",
    specialRequests: "",
  };

  it("accepts valid input and normalises mobile/email", () => {
    const r = customerDetailsSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.customerMobile).toBe("9820012345");
      expect(r.data.customerEmail).toBeUndefined();
      expect(r.data.passengers).toBe(3);
    }
  });

  it.each(["12345", "5820012345", "98200123456", "abcdefghij"])("rejects mobile %s", (m) => {
    expect(customerDetailsSchema.safeParse({ ...valid, customerMobile: m }).success).toBe(false);
  });

  it("rejects a bad email but allows empty", () => {
    expect(customerDetailsSchema.safeParse({ ...valid, customerEmail: "nope" }).success).toBe(false);
    expect(customerDetailsSchema.safeParse({ ...valid, customerEmail: "a@b.in" }).success).toBe(true);
  });

  it("requires a name and pickup address", () => {
    expect(customerDetailsSchema.safeParse({ ...valid, customerName: " " }).success).toBe(false);
    expect(customerDetailsSchema.safeParse({ ...valid, pickupAddress: "" }).success).toBe(false);
  });
});

describe("mobile normalisation", () => {
  it.each([
    ["9820012345", "9820012345"],
    ["+919820012345", "9820012345"],
    ["919820012345", "9820012345"],
    ["09820012345", "9820012345"],
    ["98200-12345", "9820012345"],
  ])("%s → %s", (input, out) => expect(normalizeMobile(input)).toBe(out));
});

describe("trip search parsing", () => {
  it("parses each trip type", () => {
    expect(parseTripSearch({ type: "airport", dir: "pickup", airport: "csmia-t2", zone: "thane", date: "2026-11-02", time: "10:00" }).success).toBe(true);
    expect(parseTripSearch({ type: "local", pkg: "8-80", from: "Andheri", date: "2026-11-02", time: "10:00" }).success).toBe(true);
    expect(parseTripSearch({ type: "round", route: "mumbai-to-pune", date: "2026-11-02", time: "10:00", ret: "2026-11-03" }).success).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(parseTripSearch({ type: "round", route: "mumbai-to-pune", date: "2026-11-02", time: "10:00" }).success).toBe(false);
    expect(parseTripSearch({ type: "bike" }).success).toBe(false);
  });
});

describe("booking code", () => {
  it("matches MUM-YYYYMMDD-XXXX using the IST date", () => {
    const code = generateBookingCode("MUM", new Date("2026-11-01T20:00:00Z")); // 2 Nov 01:30 IST
    expect(code).toMatch(BOOKING_CODE_RE);
    expect(code.startsWith("MUM-20261102-")).toBe(true);
  });

  it("track schema upper-cases the code", () => {
    const r = trackBookingSchema.safeParse({ code: " mum-20261102-ab23 ", mobile: "9820012345" });
    expect(r.success && r.data.code).toBe("MUM-20261102-AB23");
  });
});

describe("status rules", () => {
  it("allows forward transitions only", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "DRIVER_ASSIGNED")).toBe(true);
    expect(canTransition("ONGOING", "COMPLETED")).toBe(true);
    expect(canTransition("COMPLETED", "PENDING")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
  });

  it("allows customer cancellation only more than 6 hours before pickup", () => {
    const pickup = istToDate("2026-11-01", "17:00")!;
    expect(canCustomerCancel("CONFIRMED", pickup, 6, NOW)).toBe(true); // 7h away
    expect(canCustomerCancel("CONFIRMED", pickup, 6, istToDate("2026-11-01", "11:30")!)).toBe(false); // 5.5h
    expect(canCustomerCancel("ONGOING", pickup, 6, NOW)).toBe(false);
  });
});
