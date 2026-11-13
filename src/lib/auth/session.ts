import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "admin_session";
const SESSION_DAYS = 7;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newSessionToken = () => randomBytes(32).toString("base64url");

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Create a DB-backed session; only a SHA-256 hash of the token is stored. */
export async function createSession(adminId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await prisma.adminSession.create({ data: { tokenHash: sha256(token), adminId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  // Housekeeping
  await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

export const getCurrentAdmin = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { admin: { select: { id: true, email: true, name: true, role: true, active: true } } },
  });
  // Deactivated admins lose access immediately
  if (!session || session.expiresAt < new Date() || !session.admin.active) return null;
  return { ...session.admin, isSuper: session.admin.role === "SUPER_ADMIN" };
});
export type CurrentAdmin = NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;

/** Use at the top of every admin page and admin server action. */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Pages/actions only the owner (super admin) may use: pricing, settings, team, companies, fleet master data… */
export async function requireSuperAdmin() {
  const admin = await requireAdmin();
  if (!admin.isSuper) redirect("/admin?denied=1");
  return admin;
}

/**
 * Which orders/bookings an admin may see.
 * Super admin: everything. Sub-admin: only corporate orders handed to them, and the duties allocated from those orders.
 */
export function orderScope(admin: CurrentAdmin): Prisma.CorporateOrderWhereInput {
  return admin.isSuper ? {} : { managerId: admin.id };
}

export function bookingScope(admin: CurrentAdmin): Prisma.BookingWhereInput {
  return admin.isSuper ? {} : { corporateOrder: { managerId: admin.id } };
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}
