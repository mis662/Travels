import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { newSessionToken, sha256 } from "./session";

/**
 * Sessions for the company portal and employee portal, stored in one PortalSession
 * table (kind = "company" | "employee"). Same design as admin/driver sessions:
 * random token in an HTTP-only cookie, only its SHA-256 hash in the database.
 */
export type PortalKind = "company" | "employee";

export const PORTAL_COOKIES: Record<PortalKind, string> = {
  company: "company_session",
  employee: "employee_session",
};

const DAYS: Record<PortalKind, number> = { company: 14, employee: 60 };

export async function createPortalSession(kind: PortalKind, subjectId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + DAYS[kind] * 86400_000);
  await prisma.portalSession.create({ data: { kind, subjectId, tokenHash: sha256(token), expiresAt } });
  (await cookies()).set(PORTAL_COOKIES[kind], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  await prisma.portalSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

/** The logged-in subject id for this portal, or null. */
export async function portalSubjectId(kind: PortalKind): Promise<string | null> {
  const token = (await cookies()).get(PORTAL_COOKIES[kind])?.value;
  if (!token) return null;
  const s = await prisma.portalSession.findUnique({ where: { tokenHash: sha256(token) } });
  if (!s || s.kind !== kind || s.expiresAt < new Date()) return null;
  return s.subjectId;
}

export async function destroyPortalSession(kind: PortalKind) {
  const jar = await cookies();
  const token = jar.get(PORTAL_COOKIES[kind])?.value;
  if (token) await prisma.portalSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(PORTAL_COOKIES[kind]);
}

/** Sign someone out everywhere (password reset, deactivation). */
export async function revokePortalSessions(kind: PortalKind, subjectId: string, exceptCurrent = false) {
  let keep: string | undefined;
  if (exceptCurrent) {
    const token = (await cookies()).get(PORTAL_COOKIES[kind])?.value;
    keep = token ? sha256(token) : undefined;
  }
  await prisma.portalSession.deleteMany({ where: { kind, subjectId, ...(keep ? { tokenHash: { not: keep } } : {}) } });
}
