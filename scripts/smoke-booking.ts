/**
 * Smoke test for the booking service against the local database.
 * Run: npx tsx scripts/smoke-booking.ts
 */
import { randomUUID } from "node:crypto";
import {
  assignDriverAndVehicle,
  cancelByCustomer,
  changeStatusByAdmin,
  createBooking,
  driverUpdateRide,
  findCustomerBooking,
} from "@/lib/services/booking";
import { istParts } from "@/lib/time";
import { prisma } from "@/lib/db";

async function main() {
  const in3days = istParts(new Date(Date.now() + 3 * 86400_000)).date;
  const key = randomUUID();
  const payload = {
    trip: { type: "oneway", route: "mumbai-to-pune", date: in3days, time: "23:30" },
    car: "sedan",
    details: {
      customerName: "Smoke Test",
      customerMobile: "+91 98200 12345",
      customerEmail: "smoke@example.com",
      pickupAddress: "Test address, Andheri West",
      dropAddress: "Koregaon Park, Pune",
      passengers: "3",
      specialRequests: "",
    },
    idempotencyKey: key,
  };

  const a = await createBooking(payload);
  console.log("create:", a);
  const b = await createBooking(payload);
  console.log("same idempotency key:", b);
  const c = await createBooking({ ...payload, idempotencyKey: randomUUID() });
  console.log("same trip, new key (duplicate window):", c);
  const d = await createBooking({ ...payload, idempotencyKey: randomUUID(), details: { ...payload.details, passengers: "6" } });
  console.log("too many passengers:", d);
  const e = await createBooking({ ...payload, idempotencyKey: randomUUID(), trip: { ...payload.trip, date: "2020-01-01" } });
  console.log("past date:", e);

  if (a.ok) {
    const found = await findCustomerBooking(a.code, "9820012345");
    console.log("found:", found?.code, found?.status, "fare", found?.estimatedFare);
    console.log("wrong mobile:", await findCustomerBooking(a.code, "9999999999"));
    await cancelByCustomer(a.code, "9820012345", "smoke test");
    const after = await findCustomerBooking(a.code, "9820012345");
    console.log("after cancel:", after?.status, after?.history.map((h) => `${h.fromStatus}->${h.toStatus}`));
    await prisma.booking.delete({ where: { code: a.code } });
  }

  // Admin lifecycle: new booking → assign → ongoing → completed
  const f = await createBooking({ ...payload, idempotencyKey: randomUUID(), car: "suv", trip: { type: "airport", dir: "pickup", airport: "csmia-t2", zone: "thane", date: in3days, time: "10:00" } });
  console.log("airport booking:", f);
  if (f.ok) {
    const bk = await prisma.booking.findUniqueOrThrow({ where: { code: f.code } });
    const driver = await prisma.driver.findFirstOrThrow({ where: { active: true } });
    const vehicle = await prisma.vehicle.findFirstOrThrow({ where: { active: true } });
    try {
      await changeStatusByAdmin(bk.id, "COMPLETED", "smoke@admin");
    } catch (e) {
      console.log("invalid transition rejected:", (e as Error).message);
    }
    try {
      await driverUpdateRide(bk.id, driver, "start");
    } catch (e) {
      console.log("start before assignment rejected:", (e as Error).message);
    }
    await assignDriverAndVehicle(bk.id, driver.id, vehicle.id, "smoke@admin");
    try {
      await driverUpdateRide(bk.id, { id: "someone-else", name: "Other" }, "start");
    } catch (e) {
      console.log("other driver rejected:", (e as Error).message);
    }
    await driverUpdateRide(bk.id, driver, "start");
    await driverUpdateRide(bk.id, driver, "complete");
    const done = await prisma.booking.findUniqueOrThrow({ where: { id: bk.id }, include: { history: { orderBy: { createdAt: "asc" } } } });
    console.log("final status:", done.status, done.history.map((h) => h.toStatus).join(" → "), "| started", !!done.startedAt, "completed", !!done.completedAt);
    if (process.env.KEEP) console.log("kept booking id:", bk.id);
    else await prisma.booking.delete({ where: { id: bk.id } });
  }
  await new Promise((r) => setTimeout(r, 500)); // let async email logs flush
}

main().finally(() => prisma.$disconnect());
