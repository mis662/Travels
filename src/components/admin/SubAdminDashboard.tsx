import Link from "next/link";
import { prisma } from "@/lib/db";
import { addDays, istStartOfDay } from "@/lib/time";
import { formatDate, formatDateTime } from "@/lib/format";
import { corpTripLabel, orderTypeLabel } from "@/lib/corporate/orders";
import { OrderStatusBadge } from "@/components/corporate/OrderStatusBadge";
import { PageTitle, Stat, StatusBadge, Table } from "./ui";

/** Dashboard for a sub-admin: only the corporate bookings assigned to them. */
export async function SubAdminDashboard({ adminId, name, denied }: { adminId: string; name: string; denied: boolean }) {
  const now = new Date();
  const today = istStartOfDay(now);
  const tomorrow = addDays(today, 1);
  const mine = { corporateOrder: { managerId: adminId } };

  const [openOrders, todays, upcomingCount, ongoing] = await Promise.all([
    prisma.corporateOrder.findMany({
      where: { managerId: adminId, status: { in: ["NEW", "IN_PROGRESS"] } },
      include: { company: true, cars: { select: { driverId: true } } },
      orderBy: [{ status: "asc" }, { startDate: "asc" }],
    }),
    prisma.booking.findMany({
      where: { ...mine, pickupAt: { gte: today, lt: tomorrow }, status: { not: "CANCELLED" } },
      include: { driver: true, vehicle: true, company: true, orderCar: { select: { position: true } } },
      orderBy: { pickupAt: "asc" },
    }),
    prisma.booking.count({ where: { ...mine, pickupAt: { gte: tomorrow }, status: { in: ["DRIVER_ASSIGNED", "CONFIRMED", "PENDING"] } } }),
    prisma.booking.count({ where: { ...mine, status: "ONGOING" } }),
  ]);
  const carsWithoutDriver = openOrders.reduce((n, o) => n + o.cars.filter((c) => !c.driverId).length, 0);

  return (
    <>
      <PageTitle title={`Welcome, ${name.split(" ")[0]}`}>
        <Link href="/admin/drivers" className="btn-outline">Add driver</Link>
      </PageTitle>
      {denied && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">That page is only for the super admin.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cars waiting for a driver" value={carsWithoutDriver} />
        <Stat label="Today's duties" value={todays.length} />
        <Stat label="Ongoing now" value={ongoing} />
        <Stat label="Upcoming duties" value={upcomingCount} />
      </div>

      <h2 className="mt-8 mb-2 font-semibold">Bookings assigned to you</h2>
      <Table head={["Booking", "Company", "Trip", "When", "Drivers", "Status"]} empty={openOrders.length === 0}>
        {openOrders.map((o) => (
          <tr key={o.id} className={o.cars.some((c) => !c.driverId) ? "bg-amber-50/60" : ""}>
            <td className="px-3 py-2"><Link href={`/admin/corporate/${o.id}`} className="font-mono font-semibold text-primary-700 underline">{o.code}</Link></td>
            <td className="px-3 py-2">{o.company.name}</td>
            <td className="px-3 py-2">{corpTripLabel(o.tripType)}<span className="block text-xs text-slate-500">{o.tripSummary}</span></td>
            <td className="px-3 py-2 whitespace-nowrap">{orderTypeLabel(o.orderType)}<span className="block text-xs text-slate-500">{formatDate(o.startDate)}{o.endDate.getTime() !== o.startDate.getTime() && ` – ${formatDate(o.endDate)}`}</span></td>
            <td className="px-3 py-2">{o.cars.filter((c) => c.driverId).length}/{o.cars.length}</td>
            <td className="px-3 py-2"><OrderStatusBadge status={o.status} /></td>
          </tr>
        ))}
      </Table>

      <h2 className="mt-8 mb-2 font-semibold">Today&apos;s duties</h2>
      <Table head={["Time", "Duty", "Company", "Driver / Car", "Employees", "Status"]} empty={todays.length === 0}>
        {todays.map((b) => (
          <tr key={b.id}>
            <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(b.pickupAt).split(", ").pop()}</td>
            <td className="px-3 py-2"><Link href={`/admin/bookings/${b.id}`} className="font-mono text-primary-700 underline">{b.code}</Link><span className="block text-xs text-slate-500">Car {b.orderCar?.position}</span></td>
            <td className="px-3 py-2">{b.company?.name}</td>
            <td className="px-3 py-2">{b.driver?.name ?? "—"}<span className="block text-xs text-slate-500">{b.vehicle?.registrationNumber}</span></td>
            <td className="px-3 py-2">{b.customerName}</td>
            <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
