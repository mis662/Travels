"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { adminSignupSchema } from "@/lib/validation/account";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, requireAdmin, verifyPassword } from "@/lib/auth/session";
import { changePasswordSchema, loginSchema } from "@/lib/validation/admin";
import { firstError, formObject, type ActionState } from "@/lib/action-state";
import { clientIp, recordFailure, tooManyFailures } from "@/lib/rate-limit";

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { email, password } = parsed.data;

  const keys = [`login:${await clientIp()}`, `login:${email}`];
  if (keys.some((k) => tooManyFailures(k, 10))) {
    return { error: "Too many failed login attempts. Try again in 15 minutes." };
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  // Compare against a dummy hash when the user doesn't exist to keep timing similar
  const ok = await verifyPassword(password, admin?.passwordHash ?? "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7Ywlx7gYwbz0wq8G4nV0f3fG5V1e3eW");
  if (!admin || !ok) {
    keys.forEach((k) => recordFailure(k, 15 * 60_000));
    return { error: "Invalid email or password" };
  }

  await createSession(admin.id);
  redirect("/admin");
}

/** New admins need the secret invite code from ADMIN_SIGNUP_CODE in .env. No code set = sign-up disabled. */
export async function adminSignupAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const expected = process.env.ADMIN_SIGNUP_CODE?.trim();
  if (!expected) return { error: "Admin sign-up is disabled. Ask the owner to set ADMIN_SIGNUP_CODE." };

  const ipKey = `admin-signup:${await clientIp()}`;
  if (tooManyFailures(ipKey, 5)) return { error: "Too many wrong invite codes. Try again in an hour." };

  const parsed = adminSignupSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { name, email, password, inviteCode } = parsed.data;

  if (!sameSecret(inviteCode, expected)) {
    recordFailure(ipKey, 60 * 60_000);
    return { error: "Invalid invite code" };
  }
  if (await prisma.adminUser.findUnique({ where: { email } })) {
    return { error: "An admin with this email already exists. Please sign in." };
  }
  // Invite-code sign-ups are sub-admins; only the super admin can promote them (Admin → Team)
  const admin = await prisma.adminUser.create({ data: { name, email, role: "SUB_ADMIN", passwordHash: await hashPassword(password) } });
  await createSession(admin.id);
  redirect("/admin");
}

function sameSecret(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const parsed = changePasswordSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(parsed.data.current, admin.passwordHash))) return { error: "Current password is incorrect" };
  await prisma.adminUser.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  return { ok: true, message: "Password changed." };
}
