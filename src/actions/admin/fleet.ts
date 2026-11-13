"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth/session";
import { driverSchema, vehicleSchema } from "@/lib/validation/admin";
import { firstError, formObject, type ActionState } from "@/lib/action-state";
import { istToDate } from "@/lib/time";

export async function saveDriverAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = driverSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { pin, ...fields } = parsed.data;
  const data = {
    ...fields,
    licenceExpiry: istToDate(fields.licenceExpiry)!,
    ...(pin ? { pinHash: await hashPassword(pin) } : {}),
  };
  if (id) {
    await prisma.driver.update({ where: { id }, data });
    // New PIN or deactivation → sign the driver out of the driver app everywhere
    if (pin || !fields.active) await prisma.driverSession.deleteMany({ where: { driverId: id } });
  } else {
    await prisma.driver.create({ data });
  }
  revalidatePath("/admin/drivers");
  return { ok: true, message: id ? "Driver saved." : "Driver added." };
}

/** Approve a driver who signed up in the driver app (or reject = delete the pending registration). */
export async function reviewDriverSignupAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const decision = String(fd.get("decision") ?? "");
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver || driver.approved) return { error: "This registration was already handled." };
  if (decision === "approve") {
    await prisma.driver.update({ where: { id }, data: { approved: true, active: true } });
  } else if (decision === "reject") {
    await prisma.driver.delete({ where: { id } });
  } else {
    return { error: "Unknown action" };
  }
  revalidatePath("/admin/drivers");
  revalidatePath("/admin", "layout");
  return { ok: true, message: decision === "approve" ? `${driver.name} approved — they can now sign in.` : "Registration rejected." };
}

export async function saveVehicleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = vehicleSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = {
    ...parsed.data,
    permitExpiry: istToDate(parsed.data.permitExpiry)!,
    insuranceExpiry: istToDate(parsed.data.insuranceExpiry)!,
  };
  try {
    if (id) await prisma.vehicle.update({ where: { id }, data });
    else await prisma.vehicle.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A vehicle with this registration number already exists." };
    }
    throw e;
  }
  revalidatePath("/admin/vehicles");
  return { ok: true, message: id ? "Vehicle saved." : "Vehicle added." };
}
