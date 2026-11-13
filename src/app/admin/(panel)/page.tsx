import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { addDays, istStartOfDay, istStartOfMonth } from "@/lib/time";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { tripTypeLabel } from "@/lib/booking/status";
import { orderTypeLabel } from "@/lib/corporate/orders";
import { SubAdminDashboard } from "@/components/admin/SubAdminDashboard";
import { ExpiryDate, PageTitle, Panel, Stat, StatusBadge, Table } from "@/components/admin/ui";

export const metadata = { title: "Dashboard" };

const ACTIVE = ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "ONGOING"];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdmin();
  const denied = (await searchParams).denied === "1";
  if (!admin.isSuper) return <SubAdminDashboard adminId={admin.id} name={admin.name} denied={denied} />;
  const now = new Date();
  const today = istStartOfDay(now);
  const tomorrow = addDays(today, 1);
  const monthStart = istStartOfMonth(now);
  const soon = addDays(now, 30);

  const [newOrders, todays, upcoming, pendingCount, monthBookings, expiringVehicles, expiringDrivers] = await Promise.all([
    prisma.corporateOrder.findMany({
      where: { status: "NEW" },
      include: { company: true, manager: { select: { name: true } }, _count: { select: { cars: true } } },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
    prisma.booking.findMany({
      where: { pickupAt: { gte: today, lt: tomorrow }, status: { not: "CANCELLED" } },
      include: { category: true, driver: true },
      orderBy: { pickupAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { pickupAt: { gte: now }, status: { in: ACTIVE } },
      include: { category: true },
      orderBy: { pickupAt: "asc" },
      take: 10,
    }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.findMany({
      where: { pickupAt: { gte: monthStart }, status: { not: "CANCELLED" } },
      select: { status: true, estimatedFare: true, finalFare: true, pickupAt: true },
    }),
    prisma.vehicle.findMany({
      where: { active: true, OR: [{ permitExpiry: { lte: soon } }, { insuranceExpiry: { lte: soon } }] },
    }),
    prisma.driver.findMany({ where: { active: true, licenceExpiry: { lte: soon } } }),
  ]);

  const completed = monthBookings.filter((b) => b.status === "COMPLETED");
  const amount = (b: { finalFare: number | null; estimatedFare: number }) => b.finalFare ?? b.estimatedFare;
  const revenue = completed.reduce((s, b) => s + amount(b), 0);
  const pipeline = monthBookings.filter((b) => b.status !== "COMPLETED").reduce((s, b) => s + amount(b), 0);

  return (
    <>
      <PageTitle title="Dashboard">
        <Link href="/admin/bookings?status=PENDING" className="btn-accent">Pending bookings ({pendingCount})</Link>
      </PageTitle>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Today's trips" value={todays.length} />
        <Stat label="Upcoming trips" value={upcoming.length >= 10 ? "10+" : upcoming.length} hint="Not yet completed" />
        <Stat label="Pending confirmation" value={pendingCount} />
        <Stat label="Completed this month" value={completed.length} />
        <Stat label="Revenue this month" value={formatINR(revenue)} hint={`+ ${formatINR(pipeline)} in open bookings (estimated)`} />
      </div>

      {newOrders.length > 0 && (
        <Panel title={`New corporate orders (${newOrders.length})`} className="mt-6 border-primary-200">
          <ul className="divide-y divide-slate-100 text-sm">
            {newOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <Link href={`/admin/corporate/${o.id}`} className="font-mono font-semibold text-primary-700 underline">{o.code}</Link>{" "}
                  <strong>{o.company.name}</strong> · {orderTypeLabel(o.orderType)} · {o.tripSummary} · {o._count.cars} car{o._count.cars > 1 ? "s" : ""} · from {formatDate(o.startDate)}
                </span>
                <span className={o.manager ? "text-slate-600" : "font-semibold text-amber-700"}>
                  {o.manager ? `Assigned to ${o.manager.name}` : "Not assigned — open it and assign a sub-admin"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {(expiringVehicles.length > 0 || expiringDrivers.length > 0) && (
        <Panel title="⚠ Documents expiring within 30 days" className="mt-6 border-amber-300 bg-amber-50">
          <ul className="space-y-1 text-sm">
            {expiringVehicles.map((v) => (
              <li key={v.id}>
                <Link href={`/admin/vehicles/${v.id}`} className="font-medium underline">{v.registrationNumber}</Link> {v.model} — permit <ExpiryDate date={v.permitExpiry} />, insurance <ExpiryDate date={v.insuranceExpiry} />
              </li>
            ))}
            {expiringDrivers.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/drivers/${d.id}`} className="font-medium underline">{d.name}</Link> — licence <ExpiryDate date={d.licenceExpiry} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">Today&apos;s bookings</h2>
          <Table head={["Time", "Booking", "Trip", "Driver", "Status"]} empty={todays.length === 0}>
            {todays.map((b) => (
              <tr key={b.id}>
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(b.pickupAt).split(", ").pop()}</td>
                <td className="px-3 py-2"><Link className="font-mono text-primary-700 underline" href={`/admin/bookings/${b.id}`}>{b.code}</Link><br /><span className="text-xs text-slate-500">{b.customerName}</span></td>
                <td className="px-3 py-2">{b.pickupLocation} → {b.dropLocation}<br /><span className="text-xs text-slate-500">{b.category.name}</span></td>
                <td className="px-3 py-2">{b.driver?.name ?? <span className="text-amber-700">Not assigned</span>}</td>
                <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </Table>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Upcoming trips</h2>
          <Table head={["Pickup", "Booking", "Trip", "Fare", "Status"]} empty={upcoming.length === 0}>
            {upcoming.map((b) => (
              <tr key={b.id}>
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(b.pickupAt)}</td>
                <td className="px-3 py-2"><Link className="font-mono text-primary-700 underline" href={`/admin/bookings/${b.id}`}>{b.code}</Link></td>
                <td className="px-3 py-2">{tripTypeLabel(b.tripType)}<br /><span className="text-xs text-slate-500">{b.dropLocation} · {b.category.name}</span></td>
                <td className="px-3 py-2">{formatINR(b.finalFare ?? b.estimatedFare)}</td>
                <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </>
  );
}
