"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { requireEmployee } from "@/lib/auth/employee-session";
import { createPortalSession, destroyPortalSession, revokePortalSessions } from "@/lib/auth/portal-session";
import { passwordChangeSchema } from "@/lib/corporate/orders";
import { mobileSchema } from "@/lib/validation/common";
import { firstError, formObject, type ActionState } from "@/lib/action-state";
import { clientIp, recordFailure, tooManyFailures } from "@/lib/rate-limit";

const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7Ywlx7gYwbz0wq8G4nV0f3fG5V1e3eW";

const loginSchema = z.object({
  mobile: mobileSchema,
  password: z.string().min(1, { error: "Enter your password" }).max(200),
});

export async function employeeLoginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { mobile, password } = parsed.data;
  const keys = [`employee-login:${await clientIp()}`, `employee-login:${mobile}`];
  if (keys.some((k) => tooManyFailures(k, 8))) return { error: "Too many wrong attempts. Try again in 15 minutes." };

  const e = await prisma.employee.findUnique({ where: { mobile }, include: { company: true } });
  const ok = await verifyPassword(password, e?.passwordHash ?? DUMMY_HASH);
  if (!e || !ok) {
    keys.forEach((k) => recordFailure(k, 15 * 60_000));
    return { error: "Wrong mobile number or password" };
  }
  if (!e.active || !e.company.active) return { error: "Your account is inactive. Please contact your company admin." };
  await createPortalSession("employee", e.id);
  redirect("/employee");
}

export async function employeeLogoutAction() {
  await destroyPortalSession("employee");
  redirect("/employee/login");
}

export async function employeeChangePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireEmployee();
  const parsed = passwordChangeSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const row = await prisma.employee.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(parsed.data.current, row.passwordHash))) return { error: "Current password is incorrect" };
  await prisma.employee.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  await revokePortalSessions("employee", me.id, true);
  return { ok: true, message: "Password changed." };
}
