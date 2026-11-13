/**
 * Booking service — the single place where bookings are created and change
 * status. Pages, server actions and (later) a payment gateway webhook should
 * call these functions rather than writing to the database directly.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateBookingCode } from "@/lib/booking/code";
import { checkPassengers, checkTripTiming, DUPLICATE_WINDOW_MS } from "@/lib/booking/rules";
import { canCustomerCancel, canTransition, statusLabel, type BookingStatus } from "@/lib/booking/status";
import { createBookingSchema } from "@/lib/validation/booking";
import { fieldErrors } from "@/lib/validation/common";
import { siteConfig } from "@/config/site";
import { getSettings } from "./settings";
import { quoteCategory, resolveTrip } from "./pricing";
import { notifyBookingCreated, notifySafely, notifyStatusChanged } from "./notifications";

const fullInclude = { category: true, driver: true, vehicle: true } as const;

export type CreateBookingResult =
  | { ok: true; code: string; duplicate: boolean }
  | { ok: false; errors: Record<string, string> };

export async function createBooking(
  raw: unknown,
  now = new Date(),
  opts: { customerId?: string } = {},
): Promise<CreateBookingResult> {
  const parsed = createBookingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { trip: search, car, details, idempotencyKey } = parsed.data;

  // Same form submitted twice → return the booking already created.
  const existing = await prisma.booking.findUnique({ where: { idempotencyKey }, select: { code: true } });
  if (existing) return { ok: true, code: existing.code, duplicate: true };

  const settings = await getSettings();
  const timing = checkTripTiming(search, settings.advanceBookingHours, now);
  if (!timing.ok) return { ok: false, errors: prefix("trip", timing.errors) };

  const trip = await resolveTrip(search);
  if (!trip) return { ok: false, errors: { _form: "The selected trip is no longer available. Please search again." } };

  const category = await prisma.carCategory.findFirst({ where: { slug: car, active: true } });
  if (!category) return { ok: false, errors: { _form: "The selected car is no longer available." } };

  const paxError = checkPassengers(details.passengers, category.seats);
  if (paxError) return { ok: false, errors: { "details.passengers": paxError } };
  if (trip.airportDirection === "PICKUP" && !details.dropAddress) {
    return { ok: false, errors: { "details.dropAddress": "Enter the drop address" } };
  }

  const fare = await quoteCategory(trip, category, settings, timing.days);
  if (!fare) return { ok: false, errors: { _form: "Fare is not available for this car on this trip." } };

  // Identical request (same mobile, car and pickup time) in the last few minutes → treat as duplicate.
  const recent = await prisma.booking.findFirst({
    where: {
      customerMobile: details.customerMobile,
      categoryId: category.id,
      pickupAt: timing.pickupAt!,
      status: { not: "CANCELLED" },
      createdAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) },
    },
    select: { code: true },
  });
  if (recent) return { ok: true, code: recent.code, duplicate: true };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateBookingCode(siteConfig.bookingCodePrefix, now);
    try {
      const booking = await prisma.booking.create({
        data: {
          code,
          status: "PENDING",
          tripType: trip.tripType,
          airportDirection: trip.airportDirection,
          categoryId: category.id,
          routeId: trip.route?.id,
          airportId: trip.airport?.id,
          zoneId: trip.zone?.id,
          packageId: trip.pkg?.id,
          pickupAt: timing.pickupAt!,
          returnAt: timing.returnAt,
          tripDays: timing.days,
          pickupLocation: trip.pickupLocation,
          dropLocation: trip.dropLocation,
          pickupAddress: details.pickupAddress,
          dropAddress: details.dropAddress,
          passengers: details.passengers,
          customerName: details.customerName,
          customerMobile: details.customerMobile,
          customerEmail: details.customerEmail,
          specialRequests: details.specialRequests || null,
          estimatedFare: fare.total,
          gstAmount: fare.gstAmount,
          fareBreakdown: JSON.stringify(fare),
          idempotencyKey,
          customerId: opts.customerId,
          history: { create: { fromStatus: null, toStatus: "PENDING", changedBy: "customer", note: "Booking request submitted online" } },
        },
        include: fullInclude,
      });
      notifySafely(() => notifyBookingCreated(booking));
      return { ok: true, code: booking.code, duplicate: false };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = String(e.meta?.target ?? "");
        if (target.includes("idempotencyKey")) {
          const again = await prisma.booking.findUnique({ where: { idempotencyKey }, select: { code: true } });
          if (again) return { ok: true, code: again.code, duplicate: true };
        }
        continue; // booking code collision → retry with a new code
      }
      throw e;
    }
  }
  return { ok: false, errors: { _form: "Could not create booking, please try again." } };
}

function prefix(p: string, errors: Record<string, string>) {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [`${p}.${k}`, v]));
}

export async function getBookingByCode(code: string) {
  return prisma.booking.findUnique({
    where: { code },
    include: { ...fullInclude, company: true, history: { orderBy: { createdAt: "asc" } } },
  });
}

export async function findCustomerBooking(code: string, mobile: string) {
  const b = await getBookingByCode(code);
  return b && b.customerMobile === mobile ? b : null;
}

export class BookingActionError extends Error {}

async function loadFull(id: string) {
  return prisma.booking.findUniqueOrThrow({ where: { id }, include: fullInclude });
}

export async function cancelByCustomer(code: string, mobile: string, reason: string, now = new Date()) {
  const b = await findCustomerBooking(code, mobile);
  if (!b) throw new BookingActionError("Booking not found");
  const settings = await getSettings();
  if (!canCustomerCancel(b.status, b.pickupAt, settings.cancellationCutoffHours, now)) {
    throw new BookingActionError(
      `Online cancellation is only possible more than ${settings.cancellationCutoffHours} hours before pickup. Please call us.`,
    );
  }
  await applyStatus(b.id, b.status, "CANCELLED", "customer", reason || "Cancelled by customer", {
    cancelReason: reason || "Cancelled by customer",
    cancelledBy: "CUSTOMER",
  });
}

export async function changeStatusByAdmin(id: string, to: BookingStatus, actor: string, note = "") {
  const b = await prisma.booking.findUnique({ where: { id } });
  if (!b) throw new BookingActionError("Booking not found");
  if (!canTransition(b.status, to)) {
    throw new BookingActionError(`Cannot change status from ${statusLabel(b.status)} to ${statusLabel(to)}`);
  }
  if (to === "DRIVER_ASSIGNED" && (!b.driverId || !b.vehicleId)) {
    throw new BookingActionError("Assign a driver and vehicle first");
  }
  const extra: Prisma.BookingUncheckedUpdateInput =
    to === "CANCELLED" ? { cancelReason: note || "Cancelled by admin", cancelledBy: "ADMIN" } : {};
  await applyStatus(id, b.status, to, actor, note, extra);
}

export async function assignDriverAndVehicle(id: string, driverId: string, vehicleId: string, actor: string) {
  const b = await prisma.booking.findUnique({ where: { id } });
  if (!b) throw new BookingActionError("Booking not found");
  if (["COMPLETED", "CANCELLED"].includes(b.status)) {
    throw new BookingActionError(`Cannot assign a driver to a ${statusLabel(b.status).toLowerCase()} booking`);
  }
  const [driver, vehicle] = await Promise.all([
    prisma.driver.findFirst({ where: { id: driverId, active: true } }),
    prisma.vehicle.findFirst({ where: { id: vehicleId, active: true } }),
  ]);
  if (!driver) throw new BookingActionError("Select an active driver");
  if (!vehicle) throw new BookingActionError("Select an active vehicle");

  const note = `Assigned ${driver.name} with ${vehicle.model} (${vehicle.registrationNumber})`;
  if (b.status === "PENDING" || b.status === "CONFIRMED") {
    await applyStatus(id, b.status, "DRIVER_ASSIGNED", actor, note, { driverId, vehicleId });
  } else {
    await prisma.$transaction([
      prisma.booking.update({ where: { id }, data: { driverId, vehicleId } }),
      prisma.bookingStatusHistory.create({
        data: { bookingId: id, fromStatus: b.status, toStatus: b.status, changedBy: actor, note: `Re-assigned: ${note}` },
      }),
    ]);
    notifySafely(async () => notifyStatusChanged(await loadFull(id), b.status));
  }
}

async function applyStatus(
  id: string,
  from: string,
  to: BookingStatus,
  actor: string,
  note: string,
  extra: Prisma.BookingUncheckedUpdateInput = {},
) {
  if (to === "ONGOING") extra = { startedAt: new Date(), ...extra };
  if (to === "COMPLETED") extra = { completedAt: new Date(), ...extra };
  await prisma.$transaction(async (tx) => {
    // Guard against concurrent changes: only update if the status is still `from`.
    const res = await tx.booking.updateMany({ where: { id, status: from }, data: { status: to } });
    if (res.count === 0) throw new BookingActionError("Booking was updated by someone else. Please refresh.");
    if (Object.keys(extra).length) await tx.booking.update({ where: { id }, data: extra });
    await tx.bookingStatusHistory.create({ data: { bookingId: id, fromStatus: from, toStatus: to, changedBy: actor, note } });
  });
  notifySafely(async () => notifyStatusChanged(await loadFull(id), from));
}

/** Driver app: Start Ride (Driver Assigned → Ongoing) or Complete Ride (Ongoing → Completed). */
export async function driverUpdateRide(bookingId: string, driver: { id: string; name: string }, action: "start" | "complete") {
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b || b.driverId !== driver.id) throw new BookingActionError("This trip is not assigned to you");
  const [from, to] = action === "start" ? (["DRIVER_ASSIGNED", "ONGOING"] as const) : (["ONGOING", "COMPLETED"] as const);
  if (b.status !== from) {
    throw new BookingActionError(`This trip is ${statusLabel(b.status).toLowerCase()} — it cannot be ${action === "start" ? "started" : "completed"} now`);
  }
  await applyStatus(bookingId, from, to, `driver: ${driver.name}`, action === "start" ? "Ride started by driver" : "Ride completed by driver");
}

export async function setFinalFare(id: string, finalFare: number | null, actor: string) {
  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { finalFare } }),
    prisma.bookingNote.create({
      data: { bookingId: id, author: actor, body: finalFare === null ? "Final fare cleared" : `Final fare set to ₹${finalFare}` },
    }),
  ]);
}

export async function addInternalNote(id: string, body: string, actor: string) {
  await prisma.bookingNote.create({ data: { bookingId: id, body, author: actor } });
}
