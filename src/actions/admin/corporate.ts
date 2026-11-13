"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, orderScope, requireAdmin, requireSuperAdmin } from "@/lib/auth/session";
import { revokePortalSessions } from "@/lib/auth/portal-session";
import { RATE_UNITS } from "@/lib/corporate/orders";
import { assignCarDriver, setOrderStatus } from "@/lib/services/corporate";
import { BookingActionError } from "@/lib/services/booking";
import { firstError, formObject, type ActionState } from "@/lib/action-state";

const companySchema = z.object({
  name: z.string().trim().min(2, { error: "Enter the company name" }).max(120),
  contactName: z.string().trim().max(80),
  contactPhone: z.string().trim().max(20),
  contactEmail: z.union([z.literal(""), z.email({ error: "Enter a valid contact email" })]),
  gstNumber: z.string().trim().toUpperCase().max(20),
  officeAddress: z.string().trim().max(300),
  billingAddress: z.string().trim().max(300),
  notes: z.string().trim().max(1000),
  managerId: z.string().optional().default(""),
  loginId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._@-]{3,60}$/, { error: "User ID: 3–60 characters, letters/numbers/._@- only (e.g. acme or hr@acme.com)" }),
  password: z.union([z.literal(""), z.string().min(8, { error: "Password must be at least 8 characters" }).max(200)]),
  active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

function fail(e: unknown): ActionState {
  if (e instanceof BookingActionError) return { error: e.message };
  throw e;
}

/** Super admin: create/edit a company account incl. its login (user ID + password). */
export async function saveCompanyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = companySchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { managerId, password, ...data } = parsed.data;
  if (!id && !password) return { error: "Set an initial password for the company login" };
  const manager = managerId ? await prisma.adminUser.findFirst({ where: { id: managerId, active: true } }) : null;
  if (managerId && !manager) return { error: "Choose an active admin" };

  const login = password ? { passwordHash: await hashPassword(password), mustChangePassword: true } : {};
  try {
    if (id) {
      await prisma.company.update({ where: { id }, data: { ...data, ...login, managerId: manager?.id ?? null } });
      if (password || !data.active) await revokePortalSessions("company", id);
    } else {
      const c = await prisma.company.create({ data: { ...data, ...login, managerId: manager?.id ?? null } });
      revalidatePath("/admin/companies");
      redirect(`/admin/companies/${c.id}?created=1`);
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "That user ID is already taken. Choose another." };
    throw e;
  }
  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${id}`);
  return { ok: true, message: password ? "Saved. New password set — the company must change it at next login." : "Company saved." };
}

/** Super admin: change an admin's role or deactivate them. */
export async function saveTeamMemberAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireSuperAdmin();
  const id = String(fd.get("id") ?? "");
  const role = String(fd.get("role")) === "SUPER_ADMIN" ? "SUPER_ADMIN" : "SUB_ADMIN";
  const active = fd.get("active") === "on";
  if (id === me.id && (role !== "SUPER_ADMIN" || !active)) return { error: "You can't demote or deactivate yourself." };
  await prisma.adminUser.update({ where: { id }, data: { role, active } });
  if (!active) await prisma.adminSession.deleteMany({ where: { adminId: id } });
  revalidatePath("/admin/team");
  return { ok: true, message: "Saved." };
}

/** Super admin: give a booking to a sub-admin. */
export async function setOrderManagerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const orderId = String(fd.get("orderId") ?? "");
  const managerId = String(fd.get("managerId") ?? "");
  const manager = managerId ? await prisma.adminUser.findFirst({ where: { id: managerId, active: true } }) : null;
  if (managerId && !manager) return { error: "Choose an active admin" };
  await prisma.corporateOrder.update({ where: { id: orderId }, data: { managerId: manager?.id ?? null } });
  revalidatePath(`/admin/corporate/${orderId}`);
  revalidatePath("/admin/corporate");
  revalidatePath("/admin");
  return { ok: true, message: manager ? `Booking assigned to ${manager.name}.` : "Booking unassigned." };
}

async function scopedOrder(orderId: string) {
  const admin = await requireAdmin();
  const order = await prisma.corporateOrder.findFirst({ where: { id: orderId, ...orderScope(admin) } });
  return { admin, order };
}

/** Sub-admin (or super admin): assign the driver (+ optional vehicle) for one car. */
export async function assignCarAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const carId = String(fd.get("carId") ?? "");
  const car = await prisma.orderCar.findUnique({ where: { id: carId }, select: { orderId: true, position: true } });
  if (!car) return { error: "Car not found" };
  const { admin, order } = await scopedOrder(car.orderId);
  if (!order) return { error: "You don't have access to this booking." };
  const driverId = String(fd.get("driverId") ?? "");
  if (!driverId) return { error: "Select a driver" };
  try {
    const res = await assignCarDriver({ carId, driverId, vehicleId: String(fd.get("vehicleId") ?? "") || undefined }, admin.email);
    revalidatePath(`/admin/corporate/${order.id}`);
    revalidatePath("/admin/corporate");
    return {
      ok: true,
      message: res.created
        ? `Car ${car.position}: driver assigned, ${res.created} dut${res.created === 1 ? "y" : "ies"} created.`
        : `Car ${car.position}: driver changed on ${res.updated} upcoming dut${res.updated === 1 ? "y" : "ies"}.`,
    };
  } catch (e) {
    return fail(e);
  }
}

export async function orderStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { admin, order } = await scopedOrder(String(fd.get("orderId") ?? ""));
  if (!order) return { error: "You don't have access to this booking." };
  const status = String(fd.get("status"));
  if (status !== "IN_PROGRESS" && status !== "COMPLETED" && status !== "CANCELLED") return { error: "Unknown status" };
  await setOrderStatus(order.id, status, admin.email);
  revalidatePath(`/admin/corporate/${order.id}`);
  revalidatePath("/admin/corporate");
  return { ok: true, message: "Booking updated." };
}

/** Super admin: agreed commercial rate (applied to duties created afterwards). */
export async function setOrderRateAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const orderId = String(fd.get("orderId") ?? "");
  const raw = String(fd.get("rate") ?? "").trim();
  const rate = raw === "" ? null : Number(raw);
  if (rate !== null && (!Number.isInteger(rate) || rate < 0 || rate > 10_000_000)) return { error: "Enter the rate in whole rupees" };
  const rateUnit = String(fd.get("rateUnit") ?? "PER_DAY");
  if (!(RATE_UNITS as readonly string[]).includes(rateUnit)) return { error: "Choose a rate unit" };
  await prisma.corporateOrder.update({ where: { id: orderId }, data: { rate, rateUnit } });
  revalidatePath(`/admin/corporate/${orderId}`);
  return { ok: true, message: "Rate saved (applies to duties created from now on)." };
}
