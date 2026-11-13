import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { newSessionToken, sha256 } from "./session";

/** Customer accounts: same design as admin/driver sessions, separate cookie and table. */
export const CUSTOMER_SESSION_COOKIE = "customer_session";
const SESSION_DAYS = 60;

export async function createCustomerSession(customerId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await prisma.customerSession.create({ data: { tokenHash: sha256(token), customerId, expiresAt } });
  (await cookies()).set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  await prisma.customerSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

export const getCurrentCustomer = cache(async () => {
  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { customer: { select: { id: true, name: true, mobile: true, email: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.customer;
});

export async function destroyCustomerSession() {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (token) await prisma.customerSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(CUSTOMER_SESSION_COOKIE);
}

/** Only allow redirects back to pages on this site (never to another domain). */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
