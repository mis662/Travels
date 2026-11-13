import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/employee-session";
import { formatDateTime, telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import { StatusBadge } from "@/components/admin/ui";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";

export const metadata = { title: "My rides" };

export default async function EmployeeRidesPage() {
  const me = await requireEmployee();
  const rides = await prisma.booking.findMany({
    where: { orderCar: { passengers: { some: { employeeId: me.id } } } },
    include: {
      driver: true,
      vehicle: true,
      corporateOrder: { select: { tripSummary: true } },
      orderCar: { include: { passengers: { include: { employee: { select: { id: true, name: true, homeArea: true } } }, orderBy: { pickupOrder: "asc" } } } },
    },
    orderBy: { pickupAt: "asc" },
    take: 200,
  });
  const now = Date.now();
  const upcoming = rides.filter((r) => r.pickupAt.getTime() >= now - 12 * 3600_000 && !["COMPLETED", "CANCELLED"].includes(r.status));
  const past = rides.filter((r) => !upcoming.includes(r)).reverse().slice(0, 30);

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">My rides</h1>
      <p className="text-sm text-slate-600">Pickup from: {me.homeAddress}</p>
      {upcoming.length === 0 && <p className="card mt-4 p-6 text-center text-slate-500">No upcoming rides. Your company books cars for you.</p>}
      <ul className="mt-4 space-y-3">
        {upcoming.map((r) => {
          const others = r.orderCar?.passengers.filter((p) => p.employee.id !== me.id) ?? [];
          const showDriver = r.driver && ["DRIVER_ASSIGNED", "ONGOING"].includes(r.status);
          return (
            <li key={r.id} className={`card p-4 ${r.status === "ONGOING" ? "border-2 border-purple-400" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{formatDateTime(r.pickupAt)}</p>
                  <p className="text-sm text-slate-600">{r.corporateOrder?.tripSummary}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {showDriver ? (
                <div className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm">
                  {r.status === "ONGOING" && <p className="mb-1 font-semibold text-purple-800">Your ride is in progress</p>}
                  <p className="font-semibold text-indigo-900">Driver: {r.driver!.name}</p>
                  {r.vehicle && <p>{r.vehicle.model} · <span className="font-mono font-semibold">{r.vehicle.registrationNumber}</span></p>}
                  <div className="mt-2 flex gap-2">
                    <a href={telHref(`+91${r.driver!.phone}`)} className="btn-accent py-1.5 text-xs"><PhoneIcon className="h-3.5 w-3.5" /> {r.driver!.phone}</a>
                    <a href={waLink(`91${r.driver!.phone}`, `Hi ${r.driver!.name}, this is ${me.name} (${r.code}).`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-1.5 text-xs"><WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp</a>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Driver details will appear here once assigned.</p>
              )}
              {others.length > 0 && (
                <p className="mt-2 text-sm text-slate-600">Riding with: {others.map((p) => `${p.employee.name}${p.employee.homeArea ? ` (${p.employee.homeArea})` : ""}`).join(", ")}</p>
              )}
            </li>
          );
        })}
      </ul>

      {past.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 font-semibold text-slate-700">Past rides</h2>
          <ul className="card divide-y divide-slate-100 text-sm">
            {past.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 p-3">
                <span>{formatDateTime(r.pickupAt)}<span className="block text-slate-500">{r.driver?.name ?? ""}</span></span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
