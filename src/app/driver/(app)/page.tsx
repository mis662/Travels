import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/auth/driver-session";
import { tripTypeLabel } from "@/lib/booking/status";
import { formatDateTime, formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "My Trips" };

export default async function DriverTripsPage() {
  const driver = await requireDriver();
  const [active, recent] = await Promise.all([
    prisma.booking.findMany({
      where: { driverId: driver.id, status: { in: ["DRIVER_ASSIGNED", "ONGOING"] } },
      include: { vehicle: true },
      orderBy: { pickupAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { driverId: driver.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">My trips</h1>
      {active.length === 0 && <p className="card mt-4 p-6 text-center text-slate-500">No trips assigned right now.</p>}
      <ul className="mt-4 space-y-3">
        {active.map((b) => (
          <li key={b.id}>
            <Link href={`/driver/trips/${b.id}`} className={`card block p-4 ${b.status === "ONGOING" ? "border-2 border-purple-400" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold text-slate-900">{formatDateTime(b.pickupAt)}</p>
                <StatusBadge status={b.status} />
              </div>
              <p className="mt-1 font-medium">{b.pickupLocation} → {b.dropLocation}</p>
              <p className="text-sm text-slate-600">{tripTypeLabel(b.tripType)} · {b.customerName} · {b.passengers} pax</p>
              {b.vehicle && <p className="text-sm text-slate-500">{b.vehicle.model} · {b.vehicle.registrationNumber}</p>}
              <p className="mt-2 text-sm font-semibold text-primary-700">Open trip →</p>
            </Link>
          </li>
        ))}
      </ul>

      {recent.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 font-semibold text-slate-700">Recently completed</h2>
          <ul className="card divide-y divide-slate-100 text-sm">
            {recent.map((b) => (
              <li key={b.id} className="flex justify-between gap-3 p-3">
                <span>{formatDateTime(b.pickupAt)}<br /><span className="text-slate-500">{b.pickupLocation} → {b.dropLocation}</span></span>
                <span className="font-medium whitespace-nowrap">{formatINR(b.finalFare ?? b.estimatedFare)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
