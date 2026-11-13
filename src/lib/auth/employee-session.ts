import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { portalSubjectId } from "./portal-session";

export const getCurrentEmployee = cache(async () => {
  const id = await portalSubjectId("employee");
  if (!id) return null;
  const e = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, name: true, mobile: true, active: true, homeAddress: true, company: { select: { id: true, name: true, active: true } } },
  });
  return e && e.active && e.company.active ? e : null;
});

export async function requireEmployee() {
  const e = await getCurrentEmployee();
  if (!e) redirect("/employee/login");
  return e;
}
