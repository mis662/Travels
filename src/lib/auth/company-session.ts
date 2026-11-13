import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { portalSubjectId } from "./portal-session";

export const getCurrentCompany = cache(async () => {
  const id = await portalSubjectId("company");
  if (!id) return null;
  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true, name: true, loginId: true, active: true, mustChangePassword: true, officeAddress: true },
  });
  return company && company.active ? company : null;
});

/** Use at the top of every company-portal page and action. Forces a password change on first login. */
export async function requireCompany(opts: { allowPasswordChange?: boolean } = {}) {
  const company = await getCurrentCompany();
  if (!company) redirect("/company/login");
  if (company.mustChangePassword && !opts.allowPasswordChange) redirect("/company/change-password");
  return company;
}
