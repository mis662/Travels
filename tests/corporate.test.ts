import { describe, expect, it } from "vitest";
import { companyOrderSchema, dutyAmount, dutyDates, employeeSchema, homeMapUrl } from "@/lib/corporate/orders";

describe("duty dates", () => {
  it("lists every day inclusive", () => {
    expect(dutyDates("2026-11-30", "2026-12-02")).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
  });

  it("skips Sundays (IST)", () => {
    // 2026-11-15 is a Sunday
    expect(dutyDates("2026-11-14", "2026-11-16", true)).toEqual(["2026-11-14", "2026-11-16"]);
  });

  it("covers a full month", () => {
    expect(dutyDates("2026-12-01", "2026-12-31")).toHaveLength(31);
    expect(dutyDates("2026-12-01", "2026-12-31", true)).toHaveLength(27);
  });

  it("returns nothing for a reversed range", () => {
    expect(dutyDates("2026-12-05", "2026-12-01")).toEqual([]);
  });
});

describe("duty amount", () => {
  it("applies per-day and per-trip rates to each duty, not monthly rates", () => {
    expect(dutyAmount(2500, "PER_DAY")).toBe(2500);
    expect(dutyAmount(1800, "PER_TRIP")).toBe(1800);
    expect(dutyAmount(65000, "PER_MONTH")).toBe(0);
    expect(dutyAmount(null, "PER_DAY")).toBe(0);
  });
});

describe("company booking validation", () => {
  const cars = JSON.stringify([
    { categoryId: "sedan", employeeIds: ["e1", "e2", "e3"] },
    { categoryId: "innova", employeeIds: ["e4"] },
  ]);
  const base = {
    tripType: "COMPANY_ROUTE",
    companyRouteId: "r1",
    orderType: "MONTHLY",
    startDate: "2026-12-01",
    endDate: "2026-12-31",
    reportingTime: "08:30",
    skipSundays: "on",
    cars,
  };

  it("accepts a monthly booking with two cars", () => {
    const r = companyOrderSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.cars).toHaveLength(2);
      expect(r.data.skipSundays).toBe(true);
    }
  });

  it("forces a single trip to one day", () => {
    const r = companyOrderSchema.safeParse({ ...base, orderType: "TRIP" });
    expect(r.success && r.data.endDate).toBe("2026-12-01");
  });

  it("requires trip-specific details", () => {
    expect(companyOrderSchema.safeParse({ ...base, tripType: "AIRPORT" }).success).toBe(false);
    expect(companyOrderSchema.safeParse({ ...base, tripType: "AIRPORT", airportSlug: "csmia-t2", airportDirection: "DROP" }).success).toBe(true);
    expect(companyOrderSchema.safeParse({ ...base, tripType: "LOCAL" }).success).toBe(false);
    expect(companyOrderSchema.safeParse({ ...base, tripType: "OUTSTATION", routeSlug: "mumbai-to-pune" }).success).toBe(true);
  });

  it("rejects empty cars and the same employee in two cars", () => {
    expect(companyOrderSchema.safeParse({ ...base, cars: "[]" }).success).toBe(false);
    expect(companyOrderSchema.safeParse({ ...base, cars: JSON.stringify([{ categoryId: "s", employeeIds: [] }]) }).success).toBe(false);
    const dup = JSON.stringify([{ categoryId: "s", employeeIds: ["e1"] }, { categoryId: "s", employeeIds: ["e1"] }]);
    expect(companyOrderSchema.safeParse({ ...base, cars: dup }).success).toBe(false);
  });

  it("rejects end before start", () => {
    expect(companyOrderSchema.safeParse({ ...base, endDate: "2026-11-30" }).success).toBe(false);
  });
});

describe("employee validation", () => {
  const e = { name: "Riya Shah", mobile: "9820011122", homeAddress: "B-12, Lokhandwala, Andheri West", active: "on" };
  it("accepts a valid employee and normalises mobile", () => {
    const r = employeeSchema.safeParse({ ...e, mobile: "+91 98200 11122" });
    expect(r.success && r.data.mobile).toBe("9820011122");
  });
  it("requires a home address and a valid mobile", () => {
    expect(employeeSchema.safeParse({ ...e, homeAddress: "" }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...e, mobile: "12345" }).success).toBe(false);
  });
  it("builds a map link", () => {
    expect(homeMapUrl({ homeMapLink: "", homeAddress: "Andheri" })).toContain("query=Andheri");
    expect(homeMapUrl({ homeMapLink: "https://maps.app.goo.gl/x", homeAddress: "A" })).toBe("https://maps.app.goo.gl/x");
  });
});
