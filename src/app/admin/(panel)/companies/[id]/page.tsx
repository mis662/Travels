import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { corpTripLabel, homeMapUrl, orderTypeLabel } from "@/lib/corporate/orders";
import { PageTitle, Panel, Table } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/corporate/OrderStatusBadge";
import { CompanyForm } from "../CompanyForm";

export const metadata = { title: "Company" };

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireSuperAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [company, admins] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        employees: { orderBy: { name: "asc" } },
        routes: { orderBy: { name: "asc" } },
        orders: { orderBy: { createdAt: "desc" }, take: 50, include: { manager: { select: { name: true } }, _count: { select: { cars: true } } } },
      },
    }),
    prisma.adminUser.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
  ]);
  if (!company) notFound();

  return (
    <>
      <Link href="/admin/companies" className="text-sm text-primary-700 hover:underline">← Companies</Link>
      <PageTitle title={company.name} />
      {created && (
        <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Company account created. Share the sign-in link <strong>/company/login</strong>, user ID <strong className="font-mono">{company.loginId}</strong> and the password you set.
        </p>
      )}
      <Panel title="Company details & login"><CompanyForm company={company} admins={admins} /></Panel>

      <h2 className="mt-8 mb-2 text-lg font-semibold">Bookings</h2>
      <Table head={["Booking", "Trip", "When", "Cars", "Sub-admin", "Status"]} empty={company.orders.length === 0}>
        {company.orders.map((o) => (
          <tr key={o.id}>
            <td className="px-3 py-2"><Link href={`/admin/corporate/${o.id}`} className="font-mono text-primary-700 underline">{o.code}</Link></td>
            <td className="px-3 py-2">{corpTripLabel(o.tripType)}<span className="block text-xs text-slate-500">{o.tripSummary}</span></td>
            <td className="px-3 py-2 whitespace-nowrap">{orderTypeLabel(o.orderType)}<span className="block text-xs text-slate-500">{formatDate(o.startDate)}{o.endDate.getTime() !== o.startDate.getTime() && ` – ${formatDate(o.endDate)}`}</span></td>
            <td className="px-3 py-2">{o._count.cars}</td>
            <td className="px-3 py-2">{o.manager?.name ?? <span className="text-amber-700">Unassigned</span>}</td>
            <td className="px-3 py-2"><OrderStatusBadge status={o.status} /></td>
          </tr>
        ))}
      </Table>

      <h2 className="mt-8 mb-2 text-lg font-semibold">Employees ({company.employees.length})</h2>
      <Table head={["Name", "Code", "Mobile", "Home location", "Status"]} empty={company.employees.length === 0}>
        {company.employees.map((e) => (
          <tr key={e.id} className={e.active ? "" : "opacity-60"}>
            <td className="px-3 py-2 font-medium">{e.name}</td>
            <td className="px-3 py-2">{e.employeeCode}</td>
            <td className="px-3 py-2">{e.mobile}</td>
            <td className="px-3 py-2">{e.homeArea && <strong>{e.homeArea}: </strong>}{e.homeAddress} <a href={homeMapUrl(e)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-700 underline">map</a></td>
            <td className="px-3 py-2">{e.active ? "Active" : "Inactive"}</td>
          </tr>
        ))}
      </Table>

      {company.routes.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 text-lg font-semibold">Company routes</h2>
          <Table head={["Name", "From", "To", "Km"]}>
            {company.routes.map((r) => (
              <tr key={r.id} className={r.active ? "" : "opacity-60"}>
                <td className="px-3 py-2 font-medium">{r.name}</td><td className="px-3 py-2">{r.fromPlace}</td><td className="px-3 py-2">{r.toPlace}</td><td className="px-3 py-2">{r.distanceKm ?? ""}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
