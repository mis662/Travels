import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/auth/driver-session";
import { statusLabel, tripTypeLabel } from "@/lib/booking/status";
import { formatDate, formatDateTime, formatINR, telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import type { Employee } from "@prisma/client";
import { homeMapUrl } from "@/lib/corporate/orders";
import { rideAction } from "@/actions/driver";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { StatusBadge } from "@/components/admin/ui";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";

export const metadata = { title: "Trip" };

const mapsLink = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

export default async function DriverTripPage({ params }: { params: Promise<{ id: string }> }) {
  const driver = await requireDriver();
  const b = await prisma.booking.findUnique({
    where: { id: (await params).id },
    include: {
      category: true,
      vehicle: true,
      company: true,
      corporateOrder: { select: { tripSummary: true, destination: true, tripType: true, airportDirection: true } },
      orderCar: { include: { passengers: { include: { employee: true }, orderBy: { pickupOrder: "asc" } } } },
    },
  });
  // Drivers can only open their own trips
  if (!b || b.driverId !== driver.id) notFound();

  const pickup = `${b.pickupAddress}${b.tripType === "LOCAL" ? "" : `, ${b.pickupLocation}`}`;
  const drop = b.dropAddress ? `${b.dropAddress}, ${b.dropLocation}` : b.dropLocation;

  return (
    <>
      <Link href="/driver" className="text-sm text-primary-700">← My trips</Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">{b.code}</h1>
        <StatusBadge status={b.status} />
      </div>

      {b.orderCar ? (
        <CorporateStops
          time={formatDateTime(b.pickupAt)}
          company={b.company?.name ?? ""}
          trip={b.corporateOrder?.tripSummary ?? ""}
          destination={b.corporateOrder?.destination ?? ""}
          fromAirport={b.corporateOrder?.tripType === "AIRPORT" && b.corporateOrder.airportDirection === "PICKUP"}
          employees={b.orderCar.passengers.map((p) => p.employee)}
          driverName={driver.name}
          code={b.code}
          note={b.specialRequests}
        />
      ) : (
      <>
      <section className="card mt-4 space-y-4 p-4">
        <div>
          <p className="text-sm text-slate-500">Pickup time</p>
          <p className="text-lg font-semibold">{formatDateTime(b.pickupAt)}</p>
          {b.returnAt && <p className="text-sm text-slate-600">Return: {formatDate(b.returnAt)} ({b.tripDays} days)</p>}
          <p className="text-sm text-slate-600">{tripTypeLabel(b.tripType)}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Pickup</p>
          <p className="font-medium whitespace-pre-wrap">{pickup}</p>
          <a href={mapsLink(pickup)} target="_blank" rel="noopener noreferrer" className="btn-outline mt-2 py-1.5 text-sm">📍 Navigate to pickup</a>
        </div>
        <div>
          <p className="text-sm text-slate-500">Drop</p>
          <p className="font-medium whitespace-pre-wrap">{drop}</p>
          {b.tripType !== "LOCAL" && (
            <a href={mapsLink(drop)} target="_blank" rel="noopener noreferrer" className="btn-outline mt-2 py-1.5 text-sm">📍 Navigate to drop</a>
          )}
        </div>
      </section>

      <section className="card mt-4 p-4">
        <p className="text-sm text-slate-500">Passenger</p>
        <p className="text-lg font-semibold">{b.customerName} <span className="text-sm font-normal text-slate-500">· {b.passengers} passenger{b.passengers > 1 ? "s" : ""}</span></p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={telHref(`+91${b.customerMobile}`)} className="btn-accent"><PhoneIcon className="h-4 w-4" /> Call</a>
          <a href={waLink(`91${b.customerMobile}`, `Hello ${b.customerName}, I am ${driver.name}, your driver for booking ${b.code}.`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
            <WhatsAppIcon className="h-4 w-4" /> WhatsApp
          </a>
        </div>
        {b.specialRequests && (
          <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm"><strong>Note:</strong> {b.specialRequests}</p>
        )}
      </section>
      </>
      )}

      <section className="card mt-4 p-4 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Car</span><span className="font-medium">{b.vehicle ? `${b.vehicle.model} · ${b.vehicle.registrationNumber}` : b.category.name}</span></div>
        {b.tripType === "CORPORATE" ? (
          <p className="mt-2 rounded-md bg-primary-50 p-2 text-primary-900"><strong>Corporate duty{b.company ? ` · ${b.company.name}` : ""}</strong> — no cash to collect, billed to the company.</p>
        ) : (
          <>
            <div className="mt-2 flex justify-between"><span className="text-slate-500">Fare to collect</span><span className="text-lg font-bold">{formatINR(b.finalFare ?? b.estimatedFare)}</span></div>
            <p className="mt-1 text-xs text-slate-500">+ toll, parking &amp; state tax as actual{b.tripType === "LOCAL" ? ", extra km/hours" : ""}. Confirm the final amount with the office if unsure.</p>
          </>
        )}
        {b.startedAt && <p className="mt-2 text-slate-600">Started: {formatDateTime(b.startedAt)}</p>}
        {b.completedAt && <p className="text-slate-600">Completed: {formatDateTime(b.completedAt)}</p>}
      </section>

      <div className="sticky bottom-0 mt-4 bg-slate-100 py-3">
        {b.status === "DRIVER_ASSIGNED" && (
          <ActionForm action={rideAction} className="space-y-2" confirm="Start this ride now? The customer will see the trip as Ongoing.">
            <input type="hidden" name="bookingId" value={b.id} />
            <input type="hidden" name="action" value="start" />
            <Submit className="btn w-full bg-green-600 py-4 text-lg text-white hover:bg-green-700">▶ Start Ride</Submit>
          </ActionForm>
        )}
        {b.status === "ONGOING" && (
          <ActionForm action={rideAction} className="space-y-2" confirm="Mark this ride as completed?">
            <input type="hidden" name="bookingId" value={b.id} />
            <input type="hidden" name="action" value="complete" />
            <Submit className="btn w-full bg-primary-800 py-4 text-lg text-white hover:bg-primary-900">✔ Complete Ride</Submit>
          </ActionForm>
        )}
        {!["DRIVER_ASSIGNED", "ONGOING"].includes(b.status) && (
          <p className="rounded-lg bg-white p-3 text-center text-sm text-slate-600">This trip is {statusLabel(b.status).toLowerCase()}.</p>
        )}
      </div>
    </>
  );
}

/** Corporate duty: every employee in this car with their home location, in pickup order. */
function CorporateStops({ time, company, trip, destination, fromAirport, employees, driverName, code, note }: {
  time: string;
  company: string;
  trip: string;
  destination: string;
  fromAirport: boolean;
  employees: Employee[];
  driverName: string;
  code: string;
  note: string | null;
}) {
  return (
    <>
      <section className="card mt-4 p-4">
        <p className="text-sm text-slate-500">Reporting time</p>
        <p className="text-lg font-semibold">{time}</p>
        <p className="text-sm text-slate-600">{company} · {trip}</p>
        {destination && !fromAirport && (
          <a href={mapsLink(destination)} target="_blank" rel="noopener noreferrer" className="btn-outline mt-2 py-1.5 text-sm">📍 Final destination: {destination}</a>
        )}
      </section>
      <section className="card mt-4 p-4" aria-label="Employees">
        <p className="mb-2 font-semibold">{fromAirport ? "Drop each employee at home" : "Pick up employees"} ({employees.length})</p>
        <ol className="space-y-3">
          {employees.map((e, i) => (
            <li key={e.id} className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold">{i + 1}. {e.name}{e.gender && <span className="text-sm font-normal text-slate-500"> · {e.gender}</span>}</p>
              <p className="text-sm text-slate-700">{e.homeAddress}{e.homeArea && `, ${e.homeArea}`}</p>
              {e.homeLandmark && <p className="text-xs text-slate-500">Near {e.homeLandmark}</p>}
              <div className="mt-2 grid grid-cols-3 gap-2">
                <a href={homeMapUrl(e)} target="_blank" rel="noopener noreferrer" className="btn-outline py-1.5 text-xs">📍 Map</a>
                <a href={telHref(`+91${e.mobile}`)} className="btn-accent py-1.5 text-xs"><PhoneIcon className="h-3.5 w-3.5" /> Call</a>
                <a href={waLink(`91${e.mobile}`, `Hello ${e.name}, I am ${driverName}, your driver today (${code}).`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-1.5 text-xs">
                  <WhatsAppIcon className="h-3.5 w-3.5" /> Chat
                </a>
              </div>
            </li>
          ))}
        </ol>
        {note && <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm"><strong>Note:</strong> {note}</p>}
      </section>
    </>
  );
}
