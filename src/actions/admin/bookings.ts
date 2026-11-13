"use server";

import { revalidatePath } from "next/cache";
import { bookingScope, requireAdmin, type CurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  addInternalNote,
  assignDriverAndVehicle,
  BookingActionError,
  changeStatusByAdmin,
  setFinalFare,
} from "@/lib/services/booking";
import { assignSchema, cancelSchema, finalFareSchema, noteSchema, statusChangeSchema } from "@/lib/validation/admin";
import { firstError, formObject, type ActionState } from "@/lib/action-state";
import { statusLabel } from "@/lib/booking/status";

async function run(admin: CurrentAdmin, bookingId: string, fn: () => Promise<void>, message: string): Promise<ActionState> {
  // Sub-admins may only act on duties of the orders they handle
  const allowed = await prisma.booking.findFirst({ where: { id: bookingId, ...bookingScope(admin) }, select: { id: true } });
  if (!allowed) return { error: "You don't have access to this booking." };
  try {
    await fn();
  } catch (e) {
    if (e instanceof BookingActionError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { ok: true, message };
}

export async function changeStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = statusChangeSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { bookingId, status, note } = parsed.data;
  return run(admin, bookingId, () => changeStatusByAdmin(bookingId, status, admin.email, note), `Status changed to ${statusLabel(status)}.`);
}

export async function assignAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = assignSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { bookingId, driverId, vehicleId } = parsed.data;
  return run(admin, bookingId, () => assignDriverAndVehicle(bookingId, driverId, vehicleId, admin.email), "Driver and vehicle assigned.");
}

export async function finalFareAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = finalFareSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { bookingId, finalFare } = parsed.data;
  return run(admin, bookingId, () => setFinalFare(bookingId, finalFare === "" ? null : finalFare, admin.email), "Final fare saved.");
}

export async function addNoteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = noteSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  return run(admin, parsed.data.bookingId, () => addInternalNote(parsed.data.bookingId, parsed.data.body, admin.email), "Note added.");
}

export async function cancelBookingAdminAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = cancelSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { bookingId, reason } = parsed.data;
  return run(admin, bookingId, () => changeStatusByAdmin(bookingId, "CANCELLED", admin.email, reason), "Booking cancelled.");
}
