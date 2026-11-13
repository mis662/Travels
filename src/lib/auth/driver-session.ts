import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { newSessionToken, sha256 } from "./session";

/** Driver-app sessions: same design as admin sessions, separate cookie and table. */
export const DRIVER_SESSION_COOKIE = "driver_session";
const SESSION_DAYS = 30;

export async function createDriverSession(driverId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await prisma.driverSession.create({ data: { tokenHash: sha256(token), driverId, expiresAt } });
  (await cookies()).set(DRIVER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  await prisma.driverSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

export const getCurrentDriver = cache(async () => {
  const token = (await cookies()).get(DRIVER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.driverSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { driver: { select: { id: true, name: true, phone: true, active: true, approved: true } } },
  });
  // Deactivated or unapproved drivers lose access immediately
  if (!session || session.expiresAt < new Date() || !session.driver.active || !session.driver.approved) return null;
  return session.driver;
});

/** Use at the top of every driver page and driver server action. */
export async function requireDriver() {
  const driver = await getCurrentDriver();
  if (!driver) redirect("/driver/login");
  return driver;
}

export async function destroyDriverSession() {
  const jar = await cookies();
  const token = jar.get(DRIVER_SESSION_COOKIE)?.value;
  if (token) await prisma.driverSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(DRIVER_SESSION_COOKIE);
}
