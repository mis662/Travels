import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateBookingCode } from "@/lib/booking/code";
import { istParts, istToDate } from "@/lib/time";
import type { FareBreakdown } from "@/lib/fare/engine";
import {
  dutyAmount,
  dutyDates,
  MAX_DUTIES_PER_CAR,
  orderTypeLabel,
  RATE_UNIT_LABELS,
  type CompanyOrderInput,
} from "@/lib/corporate/orders";
import { BookingActionError } from "./booking";
import { getSettings } from "./settings";
import { notifySafely, sendEmail } from "./notifications";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function orderCode(now = new Date()) {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `ORD-${istParts(now).date.replaceAll("-", "")}-${s}`;
}

/** Work out the human summary + destination for the chosen trip. */
async function resolveTrip(companyId: string, input: CompanyOrderInput) {
  switch (input.tripType) {
    case "AIRPORT": {
      const airport = await prisma.airport.findFirst({ where: { slug: input.airportSlug, active: true } });
      if (!airport) throw new BookingActionError("Choose an airport");
      const drop = input.airportDirection === "DROP";
      return {
        tripSummary: drop ? `Drop to ${airport.name}` : `Pickup from ${airport.name}`,
        destination: drop ? airport.name : "Employees' homes",
        airportId: airport.id,
        airportDirection: input.airportDirection,
      };
    }
    case "LOCAL": {
      const pkg = await prisma.localPackage.findFirst({ where: { code: input.packageCode, active: true } });
      if (!pkg) throw new BookingActionError("Choose a local package");
      return { tripSummary: `Local rental ${pkg.name}`, destination: "", packageId: pkg.id };
    }
    case "OUTSTATION": {
      const route = await prisma.route.findFirst({ where: { slug: input.routeSlug, active: true } });
      if (!route) throw new BookingActionError("Choose an outstation destination");
      return {
        tripSummary: `${route.fromCity} → ${route.toCity} (${input.roundTrip ? "round trip" : "one way"}, ${route.distanceKm} km)`,
        destination: route.toCity,
        routeId: route.id,
        roundTrip: input.roundTrip,
      };
    }
    case "COMPANY_ROUTE": {
      const r = await prisma.companyRoute.findFirst({ where: { id: input.companyRouteId, companyId, active: true } });
      if (!r) throw new BookingActionError("Choose one of your routes");
      return { tripSummary: `${r.name}: ${r.fromPlace} → ${r.toPlace}`, destination: r.toPlace, companyRouteId: r.id };
    }
  }
}

/** A company books one or more cars and decides who rides in each. */
export async function createCompanyOrder(companyId: string, input: CompanyOrderInput, createdBy: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId, active: true } });
  if (!company) throw new BookingActionError("Company account is inactive");

  const trip = await resolveTrip(companyId, input);

  const categoryIds = [...new Set(input.cars.map((c) => c.categoryId))];
  const categories = await prisma.carCategory.findMany({ where: { id: { in: categoryIds }, active: true } });
  const catById = new Map(categories.map((c) => [c.id, c]));
  const employeeIds = input.cars.flatMap((c) => c.employeeIds);
  const employees = await prisma.employee.findMany({ where: { id: { in: employeeIds }, companyId, active: true }, select: { id: true } });
  if (employees.length !== employeeIds.length) throw new BookingActionError("Some selected employees are not active in your company");

  input.cars.forEach((car, i) => {
    const cat = catById.get(car.categoryId);
    if (!cat) throw new BookingActionError(`Car ${i + 1}: choose an available car type`);
    if (car.employeeIds.length > cat.seats) {
      throw new BookingActionError(`Car ${i + 1}: a ${cat.name} seats ${cat.seats}, but ${car.employeeIds.length} employees are selected`);
    }
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await prisma.corporateOrder.create({
        data: {
          code: orderCode(),
          companyId,
          orderType: input.orderType,
          startDate: istToDate(input.startDate)!,
          endDate: istToDate(input.endDate)!,
          reportingTime: input.reportingTime,
          skipSundays: input.orderType !== "TRIP" && input.skipSundays,
          tripType: input.tripType,
          requirements: input.requirements,
          managerId: company.managerId, // default sub-admin, if the company has one
          createdBy,
          ...trip,
          cars: {
            create: input.cars.map((car, i) => ({
              position: i + 1,
              categoryId: car.categoryId,
              passengers: { create: car.employeeIds.map((employeeId, j) => ({ employeeId, pickupOrder: j + 1 })) },
            })),
          },
        },
      });
      notifySafely(async () => {
        const s = await getSettings();
        const text = [
          `New corporate booking ${order.code} from ${company.name}`,
          `${orderTypeLabel(order.orderType)} · ${trip.tripSummary}`,
          `From ${input.startDate}${input.endDate !== input.startDate ? ` to ${input.endDate}` : ""} at ${order.reportingTime}`,
          `${input.cars.length} car(s), ${employeeIds.length} employee(s)`,
          `Assign it to a sub-admin in the admin panel.`,
        ].join("\n");
        await sendEmail({ to: process.env.ADMIN_NOTIFY_EMAIL || s.email, subject: `New corporate booking ${order.code} – ${company.name}`, text, html: `<pre>${text.replace(/</g, "&lt;")}</pre>` });
      });
      return order;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new BookingActionError("Could not create the booking, please try again");
}

/**
 * Assign (or change) the driver — and optionally the vehicle — of one car.
 * First time: creates one duty per day for that car, already "Driver Assigned".
 * Later: moves all not-yet-started duties of that car to the new driver/vehicle.
 */
export async function assignCarDriver(input: { carId: string; driverId: string; vehicleId?: string }, actor: string) {
  const car = await prisma.orderCar.findUnique({
    where: { id: input.carId },
    include: {
      order: { include: { company: true } },
      category: true,
      passengers: { include: { employee: true }, orderBy: { pickupOrder: "asc" } },
      duties: { select: { id: true, status: true } },
    },
  });
  if (!car) throw new BookingActionError("Car not found");
  const order = car.order;
  if (order.status === "CANCELLED" || order.status === "COMPLETED") throw new BookingActionError("This booking is closed. Reopen it first.");

  const [driver, vehicle] = await Promise.all([
    prisma.driver.findFirst({ where: { id: input.driverId, active: true, approved: true } }),
    input.vehicleId ? prisma.vehicle.findFirst({ where: { id: input.vehicleId, active: true } }) : null,
  ]);
  if (!driver) throw new BookingActionError("Select an active driver");
  if (input.vehicleId && !vehicle) throw new BookingActionError("Select an active vehicle");

  const dates = dutyDates(istParts(order.startDate).date, istParts(order.endDate).date, order.skipSundays);
  if (dates.length === 0) throw new BookingActionError("No duty days in this booking");
  if (dates.length > MAX_DUTIES_PER_CAR) throw new BookingActionError(`A car can have at most ${MAX_DUTIES_PER_CAR} daily duties per booking`);
  const pickupTimes = dates.map((d) => istToDate(d, order.reportingTime)!);

  // Don't double-book: same driver or vehicle with another active trip within 4 hours of a duty
  const GAP = 4 * 3600_000;
  const clash = await prisma.booking.findFirst({
    where: {
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      OR: [{ orderCarId: null }, { orderCarId: { not: car.id } }],
      AND: [
        { OR: [{ driverId: driver.id }, ...(vehicle ? [{ vehicleId: vehicle.id }] : [])] },
        { OR: pickupTimes.map((t) => ({ pickupAt: { gt: new Date(t.getTime() - GAP), lt: new Date(t.getTime() + GAP) } })) },
      ],
    },
    select: { code: true, pickupAt: true, driverId: true },
  });
  if (clash) {
    const who = clash.driverId === driver.id ? driver.name : vehicle!.registrationNumber;
    throw new BookingActionError(`${who} already has trip ${clash.code} on ${istParts(clash.pickupAt).date} around that time. Choose another driver/vehicle.`);
  }

  const vehicleText = vehicle ? ` with ${vehicle.model} (${vehicle.registrationNumber})` : "";
  const note = `Car ${car.position} of ${order.code}: ${driver.name}${vehicleText}`;

  if (car.duties.length > 0) {
    // Re-assignment: move open duties
    const open = car.duties.filter((d) => ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"].includes(d.status));
    await prisma.$transaction([
      prisma.orderCar.update({ where: { id: car.id }, data: { driverId: driver.id, vehicleId: vehicle?.id ?? null } }),
      ...open.map((d) =>
        prisma.booking.update({
          where: { id: d.id },
          data: {
            driverId: driver.id,
            vehicleId: vehicle?.id ?? null,
            history: { create: { fromStatus: d.status, toStatus: d.status, changedBy: actor, note: `Re-assigned: ${note}` } },
          },
        }),
      ),
    ]);
    return { created: 0, updated: open.length };
  }

  const people = car.passengers.map((p) => p.employee);
  const first = people[0];
  const amount = dutyAmount(order.rate, order.rateUnit);
  const breakdown: FareBreakdown = {
    lines: amount ? [{ label: "Corporate contract rate", amount, detail: `₹${order.rate} ${RATE_UNIT_LABELS[order.rateUnit as keyof typeof RATE_UNIT_LABELS] ?? ""}` }] : [],
    subtotal: amount,
    gstPercent: 0,
    gstAmount: 0,
    total: amount,
    inclusions: [`Corporate duty for ${order.company.name}`],
    extras: ["Billed to the company as per contract — no payment by employees"],
  };
  const fromAirport = order.tripType === "AIRPORT" && order.airportDirection === "PICKUP";

  await prisma.$transaction(async (tx) => {
    await tx.orderCar.update({ where: { id: car.id }, data: { driverId: driver.id, vehicleId: vehicle?.id ?? null } });
    for (const [i, date] of dates.entries()) {
      for (let attempt = 0; ; attempt++) {
        try {
          await tx.booking.create({
            data: {
              code: generateBookingCode("COR", pickupTimes[i]),
              status: "DRIVER_ASSIGNED",
              tripType: "CORPORATE",
              categoryId: car.categoryId,
              companyId: order.companyId,
              corporateOrderId: order.id,
              orderCarId: car.id,
              pickupAt: pickupTimes[i],
              pickupLocation: fromAirport ? order.tripSummary.replace(/^Pickup from /, "") : `${people.length} employee pickup${people.length > 1 ? "s" : ""}`,
              dropLocation: order.destination || order.tripSummary,
              pickupAddress: fromAirport ? order.tripSummary : first.homeAddress,
              dropAddress: order.destination,
              passengers: people.length,
              customerName: people.map((p) => p.name).join(", ").slice(0, 200),
              customerMobile: first.mobile,
              customerEmail: first.email || null,
              specialRequests: order.requirements || null,
              estimatedFare: amount,
              gstAmount: 0,
              fareBreakdown: JSON.stringify(breakdown),
              paymentMethod: "CORPORATE",
              driverId: driver.id,
              vehicleId: vehicle?.id ?? null,
              history: { create: { fromStatus: null, toStatus: "DRIVER_ASSIGNED", changedBy: actor, note: `${note} — ${date}` } },
            },
          });
          break;
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 5) continue;
          throw e;
        }
      }
    }
    if (order.status === "NEW") await tx.corporateOrder.update({ where: { id: order.id }, data: { status: "IN_PROGRESS" } });
  }, { timeout: 30_000 });
  return { created: dates.length, updated: 0 };
}

/** Close or reopen a booking. Cancelling also cancels duties that haven't started. */
export async function setOrderStatus(orderId: string, status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED", actor: string) {
  const order = await prisma.corporateOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new BookingActionError("Booking not found");
  await prisma.$transaction(async (tx) => {
    await tx.corporateOrder.update({ where: { id: orderId }, data: { status } });
    if (status === "CANCELLED") {
      const open = await tx.booking.findMany({
        where: { corporateOrderId: orderId, status: { in: ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"] } },
        select: { id: true, status: true },
      });
      for (const b of open) {
        await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", cancelledBy: "ADMIN", cancelReason: `Booking ${order.code} cancelled` } });
        await tx.bookingStatusHistory.create({ data: { bookingId: b.id, fromStatus: b.status, toStatus: "CANCELLED", changedBy: actor, note: `Booking ${order.code} cancelled` } });
      }
    }
  });
}
