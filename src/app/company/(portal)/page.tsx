import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/company-session";
import { addDays, istStartOfDay } from "@/lib/time";
import { formatDate, formatDateTime } from "@/lib/format";
import { corpTripLabel, orderTypeLabel } from "@/lib/corporate/orders";
import { PageTitle, Panel, Stat, StatusBadge, Table } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/corporate/OrderStatusBadge";

export const metadata = { title: "Dashboard" };

export default async function CompanyDashboard() {
  const company = await requireCompany();
  const today = istStartOfDay(new Date());
  const [employees, openOrders, todays] = await Promise.all([
    prisma.employee.count({ where: { companyId: company.id, active: true } }),
    prisma.corporateOrder.findMany({
      where: { companyId: company.id, status: { in: ["NEW", "IN_PROGRESS"] } },
      include: { _count: { select: { cars: true } } },
      orderBy: { startDate: "asc" },
    }),
    prisma.booking.findMany({
      where: { companyId: company.id, pickupAt: { gte: today, lt: addDays(today, 1) }, status: { not: "CANCELLED" } },
      include: { driver: true, vehicle: true, orderCar: { select: { position: true } } },
      orderBy: { pickupAt: "asc" },
    }),
  ]);

  return (
    <>
      <PageTitle title="Dashboard">
        <Link href="/company/book" className="btn-accent">Book cars</Link>
        <Link href="/company/employees" className="btn-outline">Add employee</Link>
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active employees" value={employees} />
        <Stat label="Open bookings" value={openOrders.length} hint={`${openOrders.filter((o) => o.status === "NEW").length} waiting for drivers`} />
        <Stat label="Cars on duty today" value={todays.length} />
      </div>

      {employees === 0 && (
        <Panel className="mt-6 border-accent-300 bg-accent-50">
          <p className="text-sm"><strong>Start here:</strong> add your employees with their home address — drivers use it as the pickup location. Then book cars and choose who rides together.</p>
        </Panel>
      )}

      <h2 className="mt-8 mb-2 font-semibold">Today&apos;s cars</h2>
      <Table head={["Time", "Car", "Employees", "Driver", "Status"]} empty={todays.length === 0}>
        {todays.map((b) => (
          <tr key={b.id}>
            <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(b.pickupAt).split(", ").pop()}</td>
            <td className="px-3 py-2">Car {b.orderCar?.position}<span className="block text-xs text-slate-500">{b.vehicle?.registrationNumber}</span></td>
            <td className="px-3 py-2">{b.customerName}</td>
            <td className="px-3 py-2">{b.driver ? <>{b.driver.name}<span className="block text-xs text-slate-500">{b.driver.phone}</span></> : "—"}</td>
            <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
          </tr>
        ))}
      </Table>

      <h2 className="mt-8 mb-2 font-semibold">Open bookings</h2>
      <Table head={["Booking", "Trip", "Period", "Cars", "Status"]} empty={openOrders.length === 0}>
        {openOrders.map((o) => (
          <tr key={o.id}>
            <td className="px-3 py-2"><Link href={`/company/orders/${o.id}`} className="font-mono text-primary-700 underline">{o.code}</Link></td>
            <td className="px-3 py-2">{corpTripLabel(o.tripType)}<span className="block text-xs text-slate-500">{o.tripSummary}</span></td>
            <td className="px-3 py-2 whitespace-nowrap">{orderTypeLabel(o.orderType)}<span className="block text-xs text-slate-500">{formatDate(o.startDate)}{o.endDate.getTime() !== o.startDate.getTime() && ` – ${formatDate(o.endDate)}`} · {o.reportingTime}</span></td>
            <td className="px-3 py-2">{o._count.cars}</td>
            <td className="px-3 py-2"><OrderStatusBadge status={o.status} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
