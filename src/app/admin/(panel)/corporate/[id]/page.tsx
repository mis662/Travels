import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { orderScope, requireAdmin } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatINR, telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import { corpTripLabel, homeMapUrl, orderTypeLabel, RATE_UNIT_LABELS, RATE_UNITS } from "@/lib/corporate/orders";
import { assignCarAction, orderStatusAction, setOrderManagerAction, setOrderRateAction } from "@/actions/admin/corporate";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageTitle, Panel, StatusBadge, Table } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/corporate/OrderStatusBadge";

export const metadata = { title: "Corporate booking" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const order = await prisma.corporateOrder.findFirst({
    where: { id, ...orderScope(admin) },
    include: {
      company: true,
      manager: { select: { id: true, name: true } },
      cars: {
        orderBy: { position: "asc" },
        include: {
          category: true,
          driver: true,
          vehicle: true,
          passengers: { include: { employee: true }, orderBy: { pickupOrder: "asc" } },
          _count: { select: { duties: true } },
        },
      },
      duties: { include: { driver: true, orderCar: { select: { position: true } } }, orderBy: { pickupAt: "asc" }, take: 400 },
    },
  });
  if (!order) notFound();

  const [drivers, vehicles, admins] = await Promise.all([
    prisma.driver.findMany({ where: { active: true, approved: true }, orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({ where: { active: true }, include: { category: true }, orderBy: { registrationNumber: "asc" } }),
    admin.isSuper ? prisma.adminUser.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }) : [],
  ]);
  const closed = order.status === "COMPLETED" || order.status === "CANCELLED";
  const period = `${formatDate(order.startDate)}${order.endDate.getTime() !== order.startDate.getTime() ? ` – ${formatDate(order.endDate)}` : ""}`;

  return (
    <>
      <Link href="/admin/corporate" className="text-sm text-primary-700 hover:underline">← Corporate bookings</Link>
      <PageTitle title={`${order.code} · ${order.company.name}`}><OrderStatusBadge status={order.status} /></PageTitle>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Panel>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div><dt className="text-slate-500">Trip</dt><dd className="font-medium">{corpTripLabel(order.tripType)} · {order.tripSummary}</dd></div>
              <div><dt className="text-slate-500">When</dt><dd className="font-medium">{orderTypeLabel(order.orderType)}: {period} at {order.reportingTime}{order.skipSundays && " (no Sundays)"}</dd></div>
              <div><dt className="text-slate-500">Cars / employees</dt><dd className="font-medium">{order.cars.length} cars · {order.cars.reduce((n, c) => n + c.passengers.length, 0)} employees</dd></div>
              {order.destination && <div><dt className="text-slate-500">Destination</dt><dd className="font-medium">{order.destination}</dd></div>}
              <div><dt className="text-slate-500">Company contact</dt><dd className="font-medium">{order.company.contactName} {order.company.contactPhone}</dd></div>
              <div><dt className="text-slate-500">Received</dt><dd className="font-medium">{formatDateTime(order.createdAt)}</dd></div>
              {order.requirements && <div className="sm:col-span-3"><dt className="text-slate-500">Company notes</dt><dd className="font-medium whitespace-pre-wrap">{order.requirements}</dd></div>}
            </dl>
          </Panel>

          {order.cars.map((car) => {
            const people = car.passengers.map((p) => p.employee);
            const driverMsg = car.driver
              ? [
                  `Duty ${order.code} – ${order.company.name}, Car ${car.position}`,
                  `${orderTypeLabel(order.orderType)}: ${period} at ${order.reportingTime}`,
                  `Trip: ${order.tripSummary}`,
                  `Pickups:`,
                  ...people.map((e, i) => `${i + 1}. ${e.name} ${e.mobile} – ${e.homeAddress}${e.homeArea ? `, ${e.homeArea}` : ""} ${homeMapUrl(e)}`),
                  `All duties are in your driver app.`,
                ].join("\n")
              : "";
            return (
              <section key={car.id} className="card p-4 sm:p-5" aria-label={`Car ${car.position}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-primary-900">Car {car.position} · {car.category.name}</h2>
                  <span className="text-sm text-slate-600">{people.length}/{car.category.seats} seats · {car._count.duties} duties</span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500 uppercase"><tr><th className="py-1 pr-3">#</th><th className="py-1 pr-3">Employee</th><th className="py-1 pr-3">Mobile</th><th className="py-1 pr-3">Home location (pickup)</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {people.map((e, i) => (
                        <tr key={e.id}>
                          <td className="py-1.5 pr-3">{i + 1}</td>
                          <td className="py-1.5 pr-3 font-medium">{e.name}{e.employeeCode && <span className="text-xs text-slate-500"> · {e.employeeCode}</span>}{e.gender && <span className="block text-xs text-slate-500">{e.gender}</span>}</td>
                          <td className="py-1.5 pr-3"><a href={telHref(`+91${e.mobile}`)} className="underline">{e.mobile}</a></td>
                          <td className="py-1.5 pr-3">{e.homeArea && <strong>{e.homeArea}: </strong>}{e.homeAddress}{e.homeLandmark && <span className="text-slate-500"> (near {e.homeLandmark})</span>} <a href={homeMapUrl(e)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-700 underline">map</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {car.driver && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-indigo-50 p-3 text-sm">
                    <span><strong>Driver:</strong> {car.driver.name} ({car.driver.phone}){car.vehicle && <> · <strong>Car:</strong> {car.vehicle.model} {car.vehicle.registrationNumber}</>}</span>
                    <a href={waLink(`91${car.driver.phone}`, driverMsg)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp ml-auto py-1 text-xs">Send pickups to driver</a>
                  </div>
                )}

                {!closed && (
                  <ActionForm action={assignCarAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <input type="hidden" name="carId" value={car.id} />
                    <div>
                      <label htmlFor={`d-${car.id}`} className="label">{car.driver ? "Change driver" : "Assign driver"}</label>
                      <select id={`d-${car.id}`} name="driverId" className="input" defaultValue={car.driverId ?? ""}>
                        <option value="">Select driver</option>
                        {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.phone}{d.policeVerification !== "VERIFIED" ? " (not verified)" : ""}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`v-${car.id}`} className="label">Vehicle (optional)</label>
                      <select id={`v-${car.id}`} name="vehicleId" className="input" defaultValue={car.vehicleId ?? ""}>
                        <option value="">Driver&apos;s own / later</option>
                        {[...vehicles].sort((a, b) => Number(b.categoryId === car.categoryId) - Number(a.categoryId === car.categoryId)).map((v) => (
                          <option key={v.id} value={v.id}>{v.registrationNumber} · {v.model} ({v.category.name})</option>
                        ))}
                      </select>
                    </div>
                    <Submit>{car.driver ? "Change" : "Assign"}</Submit>
                  </ActionForm>
                )}
              </section>
            );
          })}

          {order.duties.length > 0 && (
            <div>
              <h2 className="mb-2 font-semibold">Duties ({order.duties.length})</h2>
              <Table head={["Date & time", "Duty", "Car", "Employees", "Driver", "Status"]}>
                {order.duties.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(d.pickupAt)}</td>
                    <td className="px-3 py-2"><Link href={`/admin/bookings/${d.id}`} className="font-mono text-primary-700 underline">{d.code}</Link></td>
                    <td className="px-3 py-2">Car {d.orderCar?.position}</td>
                    <td className="px-3 py-2">{d.customerName}</td>
                    <td className="px-3 py-2">{d.driver?.name ?? "—"}</td>
                    <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {admin.isSuper && (
            <Panel title="Assign to sub-admin">
              <ActionForm action={setOrderManagerAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <select name="managerId" className="input" defaultValue={order.managerId ?? ""} aria-label="Sub-admin">
                  <option value="">— Not assigned —</option>
                  {admins.map((a) => <option key={a.id} value={a.id}>{a.name}{a.role === "SUPER_ADMIN" ? " (super admin)" : ""}</option>)}
                </select>
                <Submit>Assign</Submit>
              </ActionForm>
              <p className="mt-2 text-xs text-slate-500">Currently: {order.manager?.name ?? "nobody"}. The sub-admin sees this booking and assigns drivers.</p>
            </Panel>
          )}

          {admin.isSuper && (
            <Panel title="Agreed rate">
              <ActionForm action={setOrderRateAction} className="space-y-2">
                <input type="hidden" name="orderId" value={order.id} />
                <div className="flex gap-2">
                  <input name="rate" type="number" min={0} defaultValue={order.rate ?? ""} placeholder="₹" className="input" aria-label="Rate" />
                  <select name="rateUnit" defaultValue={order.rateUnit} className="input" aria-label="Rate unit">
                    {RATE_UNITS.map((u) => <option key={u} value={u}>{RATE_UNIT_LABELS[u]}</option>)}
                  </select>
                </div>
                <Submit className="btn-outline">Save rate</Submit>
              </ActionForm>
              {order.rate ? <p className="mt-2 text-xs text-slate-500">{formatINR(order.rate)} {RATE_UNIT_LABELS[order.rateUnit as keyof typeof RATE_UNIT_LABELS]} per car</p> : null}
            </Panel>
          )}

          <Panel title="Booking status">
            <ActionForm action={orderStatusAction} className="flex flex-wrap gap-2" confirm="Change the booking status? Cancelling also cancels duties that haven't started.">
              <input type="hidden" name="orderId" value={order.id} />
              {closed ? (
                <Submit name="status" value="IN_PROGRESS" className="btn-outline">Reopen</Submit>
              ) : (
                <>
                  <Submit name="status" value="COMPLETED" className="btn-primary">Mark completed</Submit>
                  <Submit name="status" value="CANCELLED" className="btn-danger">Cancel booking</Submit>
                </>
              )}
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}
