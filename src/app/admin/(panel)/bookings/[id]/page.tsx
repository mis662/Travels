import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { bookingScope, requireAdmin } from "@/lib/auth/session";
import { ALLOWED_TRANSITIONS, statusLabel, tripTypeLabel, type BookingStatus } from "@/lib/booking/status";
import { formatDate, formatDateTime, formatINR, telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import type { FareBreakdown } from "@/lib/fare/engine";
import { siteConfig } from "@/config/site";
import { FareBreakdownView } from "@/components/booking/FareBreakdownView";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { ExpiryDate, PageTitle, Panel, StatusBadge } from "@/components/admin/ui";
import {
  addNoteAction,
  assignAction,
  cancelBookingAdminAction,
  changeStatusAction,
  finalFareAction,
} from "@/actions/admin/bookings";

export const metadata = { title: "Booking" };

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const b = await prisma.booking.findFirst({
    where: { id, ...bookingScope(admin) },
    include: {
      category: true,
      driver: true,
      vehicle: true,
      route: true,
      package: true,
      company: true,
      corporateOrder: { select: { id: true, code: true } },
      history: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!b) notFound();

  const [drivers, vehicles] = await Promise.all([
    prisma.driver.findMany({ where: { active: true, approved: true }, orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({ where: { active: true }, include: { category: true }, orderBy: { registrationNumber: "asc" } }),
  ]);
  // Vehicles of the booked category first
  vehicles.sort((x, y) => Number(y.categoryId === b.categoryId) - Number(x.categoryId === b.categoryId));

  const fare = JSON.parse(b.fareBreakdown) as FareBreakdown;
  const next = ALLOWED_TRANSITIONS[b.status as BookingStatus] ?? [];
  const terminal = b.status === "COMPLETED" || b.status === "CANCELLED";
  const customerMsg =
    `Hello ${b.customerName}, your booking ${b.code} (${tripTypeLabel(b.tripType)}, ${formatDateTime(b.pickupAt)}) is ${statusLabel(b.status)}.` +
    (b.driver ? ` Driver: ${b.driver.name} (${b.driver.phone})` : "") +
    (b.vehicle ? `, ${b.vehicle.model} ${b.vehicle.registrationNumber}.` : "") +
    ` Fare: ${formatINR(b.finalFare ?? b.estimatedFare)} (toll/parking extra).`;
  const driverMsg = [
    `New trip ${b.code}`,
    `Pickup: ${formatDateTime(b.pickupAt)}`,
    `From: ${b.pickupAddress} (${b.pickupLocation})`,
    `To: ${b.dropAddress || b.dropLocation}`,
    `Passenger: ${b.customerName}, ${b.customerMobile} (${b.passengers} pax)`,
    `Collect: ${formatINR(b.finalFare ?? b.estimatedFare)} + toll/parking`,
    `Open trip & tap Start Ride: ${siteConfig.url}/driver/trips/${b.id}`,
  ].join("\n");

  return (
    <>
      <Link href="/admin/bookings" className="text-sm text-primary-700 hover:underline">← All bookings</Link>
      <PageTitle title={b.code}>
        <StatusBadge status={b.status} />
        <a href={telHref(`+91${b.customerMobile}`)} className="btn-outline">Call customer</a>
        <a href={waLink(`91${b.customerMobile}`, customerMsg)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">WhatsApp customer</a>
      </PageTitle>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Panel title="Trip">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {b.corporateOrder && (
                <div className="sm:col-span-2 rounded-md bg-primary-50 p-2">
                  Corporate duty for <strong>{b.company?.name}</strong> · order{" "}
                  <Link href={`/admin/corporate/${b.corporateOrder.id}`} className="font-mono text-primary-700 underline">{b.corporateOrder.code}</Link>
                </div>
              )}
              <Item k="Trip type" v={tripTypeLabel(b.tripType) + (b.airportDirection ? ` (${b.airportDirection === "PICKUP" ? "from airport" : "to airport"})` : "")} />
              <Item k="Car" v={`${b.category.name} – ${b.category.exampleModels}`} />
              <Item k="From" v={b.pickupLocation} />
              <Item k="To" v={b.dropLocation} />
              <Item k="Pickup" v={formatDateTime(b.pickupAt)} />
              {b.returnAt && <Item k="Return" v={`${formatDate(b.returnAt)} · ${b.tripDays} day(s)`} />}
              {b.route && <Item k="Distance" v={`${b.route.distanceKm} km one way`} />}
              {b.package && <Item k="Package" v={b.package.name} />}
              <Item k="Pickup address" v={b.pickupAddress} wide />
              {b.dropAddress && <Item k="Drop address" v={b.dropAddress} wide />}
              <Item k="Passengers" v={String(b.passengers)} />
              <Item k="Booked on" v={formatDateTime(b.createdAt)} />
              {b.startedAt && <Item k="Ride started" v={formatDateTime(b.startedAt)} />}
              {b.completedAt && <Item k="Ride completed" v={formatDateTime(b.completedAt)} />}
              {b.specialRequests && <Item k="Special requests" v={b.specialRequests} wide />}
              {b.cancelReason && <Item k="Cancel reason" v={`${b.cancelReason} (by ${b.cancelledBy?.toLowerCase()})`} wide />}
            </dl>
          </Panel>
          <Panel title="Customer">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <Item k="Name" v={b.customerName} />
              <Item k="Mobile" v={b.customerMobile} />
              <Item k="Email" v={b.customerEmail ?? "—"} />
            </dl>
          </Panel>
          <Panel>
            <FareBreakdownView fare={fare} title="Fare at booking (estimate)" showNote={false} />
            <p className="mt-3 text-sm">Payment: <strong>{b.paymentStatus}</strong> · {b.paymentMethod.replace("_", " ").toLowerCase()}</p>
          </Panel>
          <Panel title="Status history">
            <ol className="space-y-2 border-l-2 border-slate-200 pl-4 text-sm">
              {b.history.map((h) => (
                <li key={h.id}>
                  <p><strong>{h.fromStatus ? `${statusLabel(h.fromStatus)} → ` : ""}{statusLabel(h.toStatus)}</strong> <span className="text-slate-500">· {formatDateTime(h.createdAt)} · {h.changedBy}</span></p>
                  {h.note && <p className="text-slate-600">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          {next.filter((s) => s !== "CANCELLED").length > 0 && (
            <Panel title="Change status">
              <ActionForm action={changeStatusAction} className="space-y-3">
                <input type="hidden" name="bookingId" value={b.id} />
                <select name="status" className="input" aria-label="New status" defaultValue={next[0]}>
                  {next.filter((s) => s !== "CANCELLED").map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
                <input name="note" className="input" placeholder="Note (optional)" maxLength={500} aria-label="Note" />
                <Submit>Update status</Submit>
              </ActionForm>
            </Panel>
          )}

          {!terminal && (
            <Panel title={b.driver ? "Re-assign driver & vehicle" : "Assign driver & vehicle"}>
              {b.driver && b.vehicle && (
                <div className="mb-3 rounded-md bg-indigo-50 p-2 text-sm">
                  <p><strong>{b.driver.name}</strong> ({b.driver.phone})<br />{b.vehicle.model} · {b.vehicle.registrationNumber}</p>
                  <a href={waLink(`91${b.driver.phone}`, driverMsg)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mt-2 py-1.5 text-xs">
                    Send trip to driver on WhatsApp
                  </a>
                  {!b.driver.pinHash && <p className="mt-1 text-xs text-amber-700">This driver has no app PIN yet — set one on the Drivers page.</p>}
                </div>
              )}
              <ActionForm action={assignAction} className="space-y-3">
                <input type="hidden" name="bookingId" value={b.id} />
                <select name="driverId" className="input" defaultValue={b.driverId ?? ""} aria-label="Driver">
                  <option value="">Select driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} · {d.phone}{d.policeVerification !== "VERIFIED" ? " (not verified)" : ""}</option>
                  ))}
                </select>
                <select name="vehicleId" className="input" defaultValue={b.vehicleId ?? ""} aria-label="Vehicle">
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} · {v.model} ({v.category.name})</option>
                  ))}
                </select>
                {drivers.length === 0 && <p className="text-sm text-amber-700">No active drivers. <Link className="underline" href="/admin/drivers">Add one</Link>.</p>}
                <Submit>Assign</Submit>
              </ActionForm>
              {b.vehicle && (
                <p className="mt-3 text-xs text-slate-500">
                  Permit: <ExpiryDate date={b.vehicle.permitExpiry} /> · Insurance: <ExpiryDate date={b.vehicle.insuranceExpiry} />
                </p>
              )}
            </Panel>
          )}

          <Panel title="Final fare">
            <ActionForm action={finalFareAction} className="space-y-2">
              <input type="hidden" name="bookingId" value={b.id} />
              <div className="flex gap-2">
                <input name="finalFare" type="number" min={0} step={1} defaultValue={b.finalFare ?? ""} placeholder={String(b.estimatedFare)} className="input" aria-label="Final fare in rupees" />
                <Submit className="btn-primary shrink-0">Save</Submit>
              </div>
            </ActionForm>
            <p className="mt-2 text-xs text-slate-500">Estimated: {formatINR(b.estimatedFare)}. Leave empty to use the estimate.</p>
          </Panel>

          <Panel title="Internal notes">
            <ActionForm action={addNoteAction} className="space-y-2" resetOnSuccess>
              <input type="hidden" name="bookingId" value={b.id} />
              <textarea name="body" rows={2} className="input" placeholder="Visible to admins only" maxLength={1000} aria-label="Note" />
              <Submit className="btn-outline">Add note</Submit>
            </ActionForm>
            <ul className="mt-3 space-y-2 text-sm">
              {b.notes.map((n) => (
                <li key={n.id} className="rounded-md bg-slate-50 p-2">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="text-xs text-slate-500">{n.author} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Panel>

          {!terminal && b.status !== "ONGOING" && (
            <Panel title="Cancel booking" className="border-red-200">
              <ActionForm action={cancelBookingAdminAction} className="space-y-2" confirm="Cancel this booking? The customer will be notified.">
                <input type="hidden" name="bookingId" value={b.id} />
                <input name="reason" className="input" placeholder="Reason (required)" maxLength={500} aria-label="Cancellation reason" />
                <Submit className="btn-danger">Cancel booking</Submit>
              </ActionForm>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Item({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium whitespace-pre-wrap text-slate-900">{v}</dd>
    </div>
  );
}
