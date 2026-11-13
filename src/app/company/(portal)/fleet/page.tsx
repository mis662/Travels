import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/company-session";
import { PageTitle } from "@/components/admin/ui";
import { CarCard } from "@/components/site/CarCard";

export const metadata = { title: "Fleet" };

export default async function CompanyFleetPage() {
  await requireCompany();
  const categories = await prisma.carCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageTitle title="Car types">
        <Link href="/company/book" className="btn-accent">Book cars</Link>
      </PageTitle>
      <p className="mb-4 text-sm text-slate-600">Pick the car type per car when booking — the seat count decides how many employees can ride together.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <CarCard key={c.id} car={c}>
            <p className="text-sm font-semibold text-primary-900">{c.seats} seater</p>
          </CarCard>
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {[["AIRPORT", "Airport transfers"], ["LOCAL", "Local hourly"], ["OUTSTATION", "Outstation"], ["COMPANY_ROUTE", "Our routes"]].map(([t, l]) => (
          <Link key={t} href={`/company/book?trip=${t}`} className="card p-4 text-center font-semibold text-primary-800 hover:border-primary-300">Book {l} →</Link>
        ))}
      </div>
    </>
  );
}
