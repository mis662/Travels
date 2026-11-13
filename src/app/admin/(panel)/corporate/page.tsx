import Link from "next/link";
import { prisma } from "@/lib/db";
import { orderScope, requireAdmin } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { corpTripLabel, ORDER_STATUS_LABELS, ORDER_STATUSES, orderTypeLabel } from "@/lib/corporate/orders";
import { PageTitle, Table } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/corporate/OrderStatusBadge";

export const metadata = { title: "Corporate bookings" };

export default async function CorporateOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; company?: string; unassigned?: string }> }) {
  const admin = await requireAdmin();
  const { status, company, unassigned } = await searchParams;
  const where = {
    ...orderScope(admin),
    ...(status && (ORDER_STATUSES as readonly string[]).includes(status) ? { status } : {}),
    ...(company ? { companyId: company } : {}),
    ...(admin.isSuper && unassigned ? { managerId: null } : {}),
  };
  const [orders, companies] = await Promise.all([
    prisma.corporateOrder.findMany({
      where,
      include: {
        company: true,
        manager: { select: { name: true } },
        cars: { select: { driverId: true, _count: { select: { passengers: true } } } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    prisma.company.findMany({
      where: admin.isSuper ? {} : { orders: { some: orderScope(admin) } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageTitle title={admin.isSuper ? "Corporate bookings" : "My corporate bookings"} />
      <form className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <select name="status" defaultValue={status ?? ""} className="input w-44" aria-label="Status">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
        </select>
        <select name="company" defaultValue={company ?? ""} className="input w-60" aria-label="Company">
          <option value="">All companies</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {admin.isSuper && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="unassigned" defaultChecked={!!unassigned} /> Not assigned to a sub-admin</label>}
        <button className="btn-primary">Filter</button>
        <Link href="/admin/corporate" className="btn-outline">Reset</Link>
      </form>
      <Table head={["Booking", "Company", "Trip", "When", "Cars", "Employees", "Drivers", "Sub-admin", "Status"]} empty={orders.length === 0}>
        {orders.map((o) => (
          <tr key={o.id} className={o.status === "NEW" ? "bg-amber-50/60" : ""}>
            <td className="px-3 py-2"><Link href={`/admin/corporate/${o.id}`} className="font-mono font-semibold text-primary-700 underline">{o.code}</Link><span className="block text-xs text-slate-500">{formatDateTime(o.createdAt)}</span></td>
            <td className="px-3 py-2 font-medium">{o.company.name}</td>
            <td className="px-3 py-2">{corpTripLabel(o.tripType)}<span className="block text-xs text-slate-500">{o.tripSummary}</span></td>
            <td className="px-3 py-2 whitespace-nowrap">{orderTypeLabel(o.orderType)}<span className="block text-xs text-slate-500">{formatDate(o.startDate)}{o.endDate.getTime() !== o.startDate.getTime() && ` – ${formatDate(o.endDate)}`} · {o.reportingTime}</span></td>
            <td className="px-3 py-2">{o.cars.length}</td>
            <td className="px-3 py-2">{o.cars.reduce((n, c) => n + c._count.passengers, 0)}</td>
            <td className="px-3 py-2">{o.cars.filter((c) => c.driverId).length}/{o.cars.length}</td>
            <td className="px-3 py-2">{o.manager?.name ?? <span className="font-semibold text-amber-700">Unassigned</span>}</td>
            <td className="px-3 py-2"><OrderStatusBadge status={o.status} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
