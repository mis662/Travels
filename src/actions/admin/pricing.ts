"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { categorySchema, chargesSchema, packageSchema, routeSchema, zoneSchema } from "@/lib/validation/admin";
import { firstError, formObject, type ActionState } from "@/lib/action-state";

function done(message: string, ...paths: string[]): ActionState {
  for (const p of ["/admin/pricing", "/", ...paths]) revalidatePath(p);
  return { ok: true, message };
}

function uniqueError(e: unknown, what: string): ActionState | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: `That ${what} is already used.` };
  return null;
}

export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = categorySchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  try {
    if (id) await prisma.carCategory.update({ where: { id }, data: parsed.data });
    else await prisma.carCategory.create({ data: parsed.data });
  } catch (e) {
    const u = uniqueError(e, "slug");
    if (u) return u;
    throw e;
  }
  if (!id) {
    revalidatePath("/admin/pricing");
    redirect("/admin/pricing");
  }
  return done("Car category saved.", "/fleet");
}

/** Grid inputs are named `fare:<rowId>:<categoryId>`. Empty cell = not offered. */
function gridValues(fd: FormData) {
  const cells: { rowId: string; categoryId: string; value: number | null }[] = [];
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("fare:") || typeof v !== "string") continue;
    const [, rowId, categoryId] = k.split(":");
    const trimmed = v.trim();
    if (trimmed === "") {
      cells.push({ rowId, categoryId, value: null });
      continue;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000 || !Number.isInteger(n)) return { error: `Invalid fare "${trimmed}" — use whole rupees` };
    cells.push({ rowId, categoryId, value: n });
  }
  return { cells };
}

export async function saveLocalFaresAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const g = gridValues(fd);
  if ("error" in g) return { error: g.error };
  await prisma.$transaction(
    g.cells.map(({ rowId: packageId, categoryId, value }) =>
      value === null
        ? prisma.localPackageFare.deleteMany({ where: { packageId, categoryId } })
        : prisma.localPackageFare.upsert({
            where: { packageId_categoryId: { packageId, categoryId } },
            update: { price: value },
            create: { packageId, categoryId, price: value },
          }),
    ),
  );
  return done("Local package fares saved.");
}

export async function saveAirportFaresAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const airportId = String(fd.get("airportId") ?? "");
  if (!airportId) return { error: "Missing airport" };
  const g = gridValues(fd);
  if ("error" in g) return { error: g.error };
  await prisma.$transaction(
    g.cells.map(({ rowId: zoneId, categoryId, value }) =>
      value === null
        ? prisma.airportFare.deleteMany({ where: { airportId, zoneId, categoryId } })
        : prisma.airportFare.upsert({
            where: { airportId_zoneId_categoryId: { airportId, zoneId, categoryId } },
            update: { fare: value },
            create: { airportId, zoneId, categoryId, fare: value },
          }),
    ),
  );
  return done("Airport fares saved.");
}

export async function saveChargesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const parsed = chargesSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await prisma.setting.update({ where: { id: 1 }, data: parsed.data });
  return done("Charges saved.");
}

export async function savePackageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = packageSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const code = `${parsed.data.hours}-${parsed.data.km}`;
  try {
    if (id) await prisma.localPackage.update({ where: { id }, data: { ...parsed.data, code } });
    else await prisma.localPackage.create({ data: { ...parsed.data, code, sortOrder: parsed.data.hours } });
  } catch (e) {
    const u = uniqueError(e, "hours/km package");
    if (u) return u;
    throw e;
  }
  return done("Package saved.");
}

export async function saveZoneAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = zoneSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (id) {
    await prisma.airportZone.update({ where: { id }, data: parsed.data });
  } else {
    const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      await prisma.airportZone.create({ data: { ...parsed.data, slug, sortOrder: 99 } });
    } catch (e) {
      const u = uniqueError(e, "zone name");
      if (u) return u;
      throw e;
    }
  }
  return done("Zone saved.");
}

export async function saveRouteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = routeSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  try {
    if (id) await prisma.route.update({ where: { id }, data: parsed.data });
    else await prisma.route.create({ data: { ...parsed.data, fromCity: "Mumbai" } });
  } catch (e) {
    const u = uniqueError(e, "URL slug");
    if (u) return u;
    throw e;
  }
  revalidatePath("/admin/routes");
  revalidatePath("/routes");
  revalidatePath(`/routes/${parsed.data.slug}`);
  if (!id) redirect("/admin/routes");
  return { ok: true, message: "Route saved." };
}
