import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getBookingByCode } from "@/lib/services/booking";
import { getCurrentCustomer } from "@/lib/auth/customer-session";
import { getSettings } from "@/lib/services/settings";
import { bookingWhatsAppMessage, waLink } from "@/lib/services/whatsapp";
import { parseRecentBookings, RECENT_BOOKINGS_COOKIE } from "@/lib/booking/cookies";
import { normalizeBookingCode } from "@/lib/booking/code";
import { statusLabel, tripTypeLabel } from "@/lib/booking/status";
import { formatDate, formatDateTime, telHref } from "@/lib/format";
import type { FareBreakdown } from "@/lib/fare/engine";
import { FareBreakdownView } from "@/components/booking/FareBreakdownView";
import { CheckIcon, PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Booking Confirmation", robots: { index: false } };

export default async function ConfirmationPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeBookingCode((await params).code);
  const jar = await cookies();
  const madeInThisBrowser = parseRecentBookings(jar.get(RECENT_BOOKINGS_COOKIE)?.value).includes(code);
  const customer = await getCurrentCustomer();
  const [found, settings] = await Promise.all([madeInThisBrowser || customer ? getBookingByCode(code) : null, getSettings()]);
  // Full details only for the browser that booked it or the signed-in account that owns it
  const mine = Boolean(found && (madeInThisBrowser || (customer && found.customerId === customer.id)));
  const booking = mine ? found : null;

  if (!mine) {
    // Details are only shown to the browser that made the booking; others must verify their mobile.
    return (
      <div className="container-x max-w-xl py-12 text-center">
        <h1 className="text-2xl font-bold">Booking {code}</h1>
        <p className="mt-3 text-slate-600">To view this booking, please verify with your mobile number.</p>
        <Link href={`/track?code=${encodeURIComponent(code)}`} className="btn-primary mt-6">Track booking</Link>
      </div>
    );
  }
  if (!booking) notFound();

  const fare = JSON.parse(booking.fareBreakdown) as FareBreakdown;
  const waMessage = bookingWhatsAppMessage(booking);
  const corporate = booking.tripType === "CORPORATE";
  const showDriver = booking.driver && ["DRIVER_ASSIGNED", "ONGOING"].includes(booking.status);

  return (
    <div className="container-x max-w-4xl py-8">
      <div className="card overflow-hidden">
        <div className={`${corporate ? "bg-primary-800" : "bg-green-600"} px-6 py-6 text-white`}>
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-full bg-white ${corporate ? "text-primary-800" : "text-green-600"}`}><CheckIcon /></span>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{corporate ? `Corporate duty · ${booking.company?.name ?? ""}` : "Booking request received!"}</h1>
              <p className="opacity-90">{corporate ? "Arranged by your company. Your driver details are below." : "We'll call or WhatsApp you shortly to confirm."}</p>
            </div>
          </div>
        </div>
        {showDriver && (
          <div className="border-b border-indigo-100 bg-indigo-50 px-6 py-4 text-sm">
            <p className="font-semibold text-indigo-900">{booking.status === "ONGOING" ? "Your ride is in progress" : "Your driver"}</p>
            <p className="mt-1">
              <strong>{booking.driver!.name}</strong> · <a className="text-primary-700 underline" href={telHref(`+91${booking.driver!.phone}`)}>{booking.driver!.phone}</a>
              {booking.vehicle && <> · {booking.vehicle.model} <span className="font-mono">{booking.vehicle.registrationNumber}</span></>}
            </p>
          </div>
        )}
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Booking ID</p>
            <p className="font-mono text-2xl font-bold tracking-wider text-primary-900">{booking.code}</p>
            <p className="mt-1 text-sm">Status: <strong>{statusLabel(booking.status)}</strong></p>
            <p className="mt-1 text-xs text-slate-500">Save this ID to track or cancel your booking.</p>

            <dl className="mt-5 space-y-2 text-sm">
              <Row k="Trip" v={tripTypeLabel(booking.tripType)} />
              <Row k="From" v={booking.pickupLocation} />
              <Row k="To" v={booking.dropLocation} />
              <Row k="Pickup" v={formatDateTime(booking.pickupAt)} />
              {booking.returnAt && <Row k="Return" v={`${formatDate(booking.returnAt)} (${booking.tripDays} days)`} />}
              <Row k="Pickup address" v={booking.pickupAddress} />
              {booking.dropAddress && <Row k="Drop address" v={booking.dropAddress} />}
              <Row k="Car" v={`${booking.category.name} (${booking.category.exampleModels})`} />
              <Row k="Passengers" v={String(booking.passengers)} />
              <Row k="Name" v={`${booking.customerName} · ${booking.customerMobile}`} />
            </dl>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            {corporate ? (
              <p className="text-sm text-slate-700"><strong>No payment needed.</strong> This duty is billed to {booking.company?.name ?? "your company"} as per contract.</p>
            ) : (
              <FareBreakdownView fare={fare} title="Estimated fare" />
            )}
          </div>
        </div>

        {!corporate && <div className="border-t border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">What happens next?</h2>
          <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-slate-700">
            <li>Our team will call/WhatsApp you to confirm the booking and final fare.</li>
            <li>Driver and car details will be shared before pickup (also visible on Track Booking).</li>
            <li>Enjoy your ride and pay the driver or our office after the trip.</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={waLink(settings.whatsappPrimary, waMessage)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
              <WhatsAppIcon className="h-4 w-4" /> Send details on WhatsApp
            </a>
            <a href={telHref(settings.phonePrimary)} className="btn-outline"><PhoneIcon className="h-4 w-4" /> Call {settings.phonePrimary}</a>
            <Link href={`/track?code=${booking.code}`} className="btn-outline">Track / Manage booking</Link>
          </div>
        </div>}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-900">{v}</dd>
    </div>
  );
}
