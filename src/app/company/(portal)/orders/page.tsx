import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/company-session";
import { formatDate, formatDateTime } from "@/lib/format";
import { corpTripLabel, orderTypeLabel } from "@/lib/corporate/orders";
import { PageTitle, Table } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/corporate/OrderStatusBadge";

export const metadata = { title: "Bookings" };

export default async function CompanyOrdersPage() {
  const company = await requireCompany();
  const orders = await prisma.corporateOrder.findMany({
    where: { companyId: company.id },
    include: { cars: { select: { driverId: true, _count: { select: { passengers: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageTitle title="Bookings"><Link href="/company/book" className="btn-accent">Book cars</Link></PageTitle>
      <Table head={["Booking", "Trip", "When", "Cars", "Employees", "Drivers assigned", "Booked", "Status"]} empty={orders.length === 0}>
        {orders.map((o) => (
          <tr key={o.id}>
            <td className="px-3 py-2"><Link href={`/company/orders/${o.id}`} className="font-mono font-semibold text-primary-700 underline">{o.code}</Link></td>
            <td className="px-3 py-2">{corpTripLabel(o.tripType)}<span className="block text-xs text-slate-500">{o.tripSummary}</span></td>
            <td className="px-3 py-2 whitespace-nowrap">{orderTypeLabel(o.orderType)}<span className="block text-xs text-slate-500">{formatDate(o.startDate)}{o.endDate.getTime() !== o.startDate.getTime() && ` – ${formatDate(o.endDate)}`} · {o.reportingTime}</span></td>
            <td className="px-3 py-2">{o.cars.length}</td>
            <td className="px-3 py-2">{o.cars.reduce((n, c) => n + c._count.passengers, 0)}</td>
            <td className="px-3 py-2">{o.cars.filter((c) => c.driverId).length} / {o.cars.length}</td>
            <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
            <td className="px-3 py-2"><OrderStatusBadge status={o.status} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
