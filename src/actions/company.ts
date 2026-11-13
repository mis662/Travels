"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { requireCompany } from "@/lib/auth/company-session";
import { createPortalSession, destroyPortalSession, revokePortalSessions } from "@/lib/auth/portal-session";
import { companyOrderSchema, companyRouteSchema, employeeSchema, passwordChangeSchema } from "@/lib/corporate/orders";
import { createCompanyOrder } from "@/lib/services/corporate";
import { BookingActionError } from "@/lib/services/booking";
import { firstError, formObject, type ActionState } from "@/lib/action-state";
import { clientIp, recordFailure, tooManyFailures } from "@/lib/rate-limit";

const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7Ywlx7gYwbz0wq8G4nV0f3fG5V1e3eW";

const loginSchema = z.object({
  loginId: z.string().trim().toLowerCase().min(1, { error: "Enter your company user ID" }).max(60),
  password: z.string().min(1, { error: "Enter your password" }).max(200),
});

export async function companyLoginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { loginId, password } = parsed.data;
  const keys = [`company-login:${await clientIp()}`, `company-login:${loginId}`];
  if (keys.some((k) => tooManyFailures(k, 8))) return { error: "Too many wrong attempts. Try again in 15 minutes." };

  const company = await prisma.company.findUnique({ where: { loginId } });
  const ok = await verifyPassword(password, company?.passwordHash ?? DUMMY_HASH);
  if (!company || !company.passwordHash || !ok) {
    keys.forEach((k) => recordFailure(k, 15 * 60_000));
    return { error: "Wrong user ID or password" };
  }
  if (!company.active) return { error: "This company account is inactive. Please contact us." };
  await createPortalSession("company", company.id);
  redirect(company.mustChangePassword ? "/company/change-password" : "/company");
}

export async function companyLogoutAction() {
  await destroyPortalSession("company");
  redirect("/company/login");
}

export async function companyChangePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const company = await requireCompany({ allowPasswordChange: true });
  const parsed = passwordChangeSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const row = await prisma.company.findUniqueOrThrow({ where: { id: company.id } });
  if (!row.passwordHash || !(await verifyPassword(parsed.data.current, row.passwordHash))) return { error: "Current password is incorrect" };
  await prisma.company.update({
    where: { id: company.id },
    data: { passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false },
  });
  await revokePortalSessions("company", company.id, true); // sign out other devices
  if (company.mustChangePassword) redirect("/company");
  return { ok: true, message: "Password changed." };
}

/** Company adds or edits an employee (with home location for pickups and a login for the employee app). */
export async function saveEmployeeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const company = await requireCompany();
  const id = String(fd.get("id") ?? "");
  const parsed = employeeSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { password, ...fields } = parsed.data;

  if (id) {
    const existing = await prisma.employee.findFirst({ where: { id, companyId: company.id } });
    if (!existing) return { error: "Employee not found" };
  } else if (!password) {
    return { error: "Set a password for the employee's login" };
  }
  const taken = await prisma.employee.findFirst({ where: { mobile: fields.mobile, ...(id ? { id: { not: id } } : {}) } });
  if (taken) return { error: "An employee with this mobile number already exists" };

  const data = { ...fields, ...(password ? { passwordHash: await hashPassword(password) } : {}) };
  if (id) {
    await prisma.employee.update({ where: { id }, data });
    if (password || !fields.active) await revokePortalSessions("employee", id);
  } else {
    await prisma.employee.create({ data: { ...data, passwordHash: data.passwordHash!, companyId: company.id } });
  }
  revalidatePath("/company/employees");
  if (!id) redirect("/company/employees?added=1");
  return { ok: true, message: "Employee saved." };
}

export async function saveCompanyRouteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const company = await requireCompany();
  const id = String(fd.get("id") ?? "");
  const parsed = companyRouteSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = { ...parsed.data, distanceKm: parsed.data.distanceKm ?? null };
  if (id) {
    const res = await prisma.companyRoute.updateMany({ where: { id, companyId: company.id }, data });
    if (res.count === 0) return { error: "Route not found" };
  } else {
    await prisma.companyRoute.create({ data: { ...data, companyId: company.id } });
  }
  revalidatePath("/company/routes");
  return { ok: true, message: id ? "Route saved." : "Route added." };
}

export async function placeCompanyOrderAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const company = await requireCompany();
  const parsed = companyOrderSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  let id: string;
  try {
    id = (await createCompanyOrder(company.id, parsed.data, `company:${company.name}`)).id;
  } catch (e) {
    if (e instanceof BookingActionError) return { error: e.message };
    throw e;
  }
  revalidatePath("/company/orders");
  redirect(`/company/orders/${id}?placed=1`);
}

/** A company can cancel its own booking until a driver has been assigned. */
export async function cancelCompanyOrderAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const company = await requireCompany();
  const id = String(fd.get("orderId") ?? "");
  const order = await prisma.corporateOrder.findFirst({ where: { id, companyId: company.id } });
  if (!order) return { error: "Booking not found" };
  if (order.status !== "NEW") return { error: "Drivers are already assigned. Please call us to change or cancel." };
  await prisma.corporateOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath(`/company/orders/${id}`);
  revalidatePath("/company/orders");
  return { ok: true, message: "Booking cancelled." };
}
