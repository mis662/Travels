import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { VehicleForm } from "@/components/admin/forms";
import { ExpiryDate, isExpiringSoon, PageTitle, Panel, Table } from "@/components/admin/ui";

export const metadata = { title: "Vehicles" };

export default async function VehiclesPage() {
  await requireAdmin();
  const [vehicles, categories] = await Promise.all([
    prisma.vehicle.findMany({ include: { category: true }, orderBy: [{ active: "desc" }, { registrationNumber: "asc" }] }),
    prisma.carCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const expiring = vehicles.filter((v) => v.active && (isExpiringSoon(v.permitExpiry) || isExpiringSoon(v.insuranceExpiry)));
  return (
    <>
      <PageTitle title="Vehicles" />
      {expiring.length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠ {expiring.length} vehicle{expiring.length > 1 ? "s have" : " has"} permit or insurance expiring within 30 days (highlighted below).
        </p>
      )}
      <Table head={["Registration", "Model", "Category", "Owner / vendor", "Permit expiry", "Insurance expiry", "Status", ""]} empty={vehicles.length === 0}>
        {vehicles.map((v) => {
          const warn = v.active && (isExpiringSoon(v.permitExpiry) || isExpiringSoon(v.insuranceExpiry));
          return (
            <tr key={v.id} className={`${warn ? "bg-amber-50" : ""} ${v.active ? "" : "opacity-60"}`}>
              <td className="px-3 py-2 font-mono font-semibold">{v.registrationNumber}</td>
              <td className="px-3 py-2">{v.model}</td>
              <td className="px-3 py-2">{v.category.name}</td>
              <td className="px-3 py-2">{v.ownerName}</td>
              <td className="px-3 py-2"><ExpiryDate date={v.permitExpiry} /></td>
              <td className="px-3 py-2"><ExpiryDate date={v.insuranceExpiry} /></td>
              <td className="px-3 py-2">{v.active ? "Active" : "Inactive"}</td>
              <td className="px-3 py-2"><Link href={`/admin/vehicles/${v.id}`} className="text-primary-700 underline">Edit</Link></td>
            </tr>
          );
        })}
      </Table>
      <Panel title="Add vehicle" className="mt-6"><VehicleForm categories={categories} /></Panel>
    </>
  );
}
