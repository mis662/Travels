import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Routes" };

export default async function RoutesAdmin() {
  await requireSuperAdmin();
  const routes = await prisma.route.findMany({ orderBy: [{ sortOrder: "asc" }, { toCity: "asc" }], include: { _count: { select: { bookings: true } } } });
  return (
    <>
      <PageTitle title="Outstation routes">
        <Link href="/admin/routes/new" className="btn-primary">New route</Link>
      </PageTitle>
      <Table head={["Route", "Distance", "Time", "Page", "Popular", "Bookings", "Status", ""]} empty={routes.length === 0}>
        {routes.map((r) => (
          <tr key={r.id} className={r.active ? "" : "opacity-60"}>
            <td className="px-3 py-2 font-medium">{r.fromCity} → {r.toCity}</td>
            <td className="px-3 py-2">{r.distanceKm} km</td>
            <td className="px-3 py-2">{r.durationText}</td>
            <td className="px-3 py-2"><Link href={`/routes/${r.slug}`} target="_blank" className="text-primary-700 underline">/routes/{r.slug}</Link></td>
            <td className="px-3 py-2">{r.popular ? "★" : ""}</td>
            <td className="px-3 py-2">{r._count.bookings}</td>
            <td className="px-3 py-2">{r.active ? "Active" : "Inactive"}</td>
            <td className="px-3 py-2"><Link href={`/admin/routes/${r.id}`} className="text-primary-700 underline">Edit</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
