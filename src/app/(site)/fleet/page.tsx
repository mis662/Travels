import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/site/PageHeader";
import { CarCard } from "@/components/site/CarCard";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = {
  title: "Our Fleet – Sedan, SUV, Innova Crysta, Luxury Cars & Tempo Traveller",
  description: "Explore our fleet in Mumbai: hatchbacks, sedans, SUVs, Innova Crysta, luxury cars, Tempo Travellers and mini buses with seating, luggage and rates.",
  alternates: { canonical: "/fleet" },
};

export default async function FleetPage() {
  const categories = await prisma.carCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { localFares: { include: { package: true } } },
  });
  return (
    <>
      <PageHeader title="Our fleet" subtitle="Well-maintained, commercially permitted and insured cars with experienced drivers." />
      <div className="container-x grid gap-5 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const fares = [...c.localFares].sort((a, b) => a.package.sortOrder - b.package.sortOrder);
          return (
            <CarCard key={c.id} car={c}>
              <dl className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                <dt className="text-slate-500">Outstation</dt><dd className="text-right font-semibold">₹{c.perKmRate}/km</dd>
                <dt className="text-slate-500">Driver allowance</dt><dd className="text-right font-semibold">{formatINR(c.driverAllowancePerDay)}/day</dd>
                {fares.map((f) => (
                  <div key={f.id} className="contents">
                    <dt className="text-slate-500">Local {f.package.name}</dt><dd className="text-right font-semibold">{formatINR(f.price)}</dd>
                  </div>
                ))}
              </dl>
              <Link href="/#book" className="btn-primary mt-3 w-full">Book {c.name}</Link>
            </CarCard>
          );
        })}
      </div>
      <p className="container-x text-xs text-slate-500">Rates before GST. Toll, parking & state tax extra. Exact models depend on availability; you&apos;ll get the listed model or similar.</p>
      <CtaBand />
    </>
  );
}
