import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import { routeFareTable } from "@/lib/services/pricing";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/site/PageHeader";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = {
  title: "Outstation Routes from Mumbai",
  description: "Cab fares from Mumbai to Pune, Lonavala, Nashik, Shirdi, Mahabaleshwar, Alibaug, Goa, Lavasa, Igatpuri and Surat. One way and round trip taxis.",
  alternates: { canonical: "/routes" },
};

export default async function RoutesPage() {
  const [settings, routes] = await Promise.all([
    getSettings(),
    prisma.route.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { toCity: "asc" }] }),
  ]);
  const withFares = await Promise.all(
    routes.map(async (r) => {
      const table = await routeFareTable(r, settings);
      return { route: r, from: Math.min(...table.map((t) => t.oneWay)) };
    }),
  );
  return (
    <>
      <PageHeader title="Outstation routes from Mumbai" subtitle="Transparent one-way and round trip fares to popular destinations. Toll, parking & state tax extra." />
      <div className="container-x grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {withFares.map(({ route: r, from }) => (
          <Link key={r.id} href={`/routes/${r.slug}`} className="card p-5 transition hover:border-primary-300 hover:shadow-md">
            <p className="text-lg font-semibold text-slate-900">Mumbai → {r.toCity}</p>
            <p className="text-sm text-slate-500">{r.distanceKm} km · {r.durationText}</p>
            <p className="mt-3 text-sm">One way from <strong className="text-primary-800">{Number.isFinite(from) ? formatINR(from) : "—"}</strong> <span className="text-xs text-slate-500">incl. GST</span></p>
          </Link>
        ))}
      </div>
      <CtaBand />
    </>
  );
}
