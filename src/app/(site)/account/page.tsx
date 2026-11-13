import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/auth/customer-session";
import { customerLogoutAction } from "@/actions/account";
import { tripTypeLabel } from "@/lib/booking/status";
import { formatDateTime, formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/admin/ui";
import { PageHeader } from "@/components/site/PageHeader";

export const metadata: Metadata = { title: "My bookings", robots: { index: false } };

const bookingInclude = { category: true, driver: true, vehicle: true } as const;
type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

/** Dashboard for normal website customers (retail bookings). Corporate clients use /company. */
export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");
  const bookings = await prisma.booking.findMany({ where: { customerId: customer.id }, include: bookingInclude, orderBy: { pickupAt: "desc" } });
  const now = Date.now();
  const upcoming = bookings.filter((b) => b.pickupAt.getTime() >= now - 12 * 3600_000 && !["CANCELLED", "COMPLETED"].includes(b.status));
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <>
      <PageHeader title={`Hello, ${customer.name.split(" ")[0]}`} subtitle={`${customer.mobile}${customer.email ? ` · ${customer.email}` : ""}`}>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/#book" className="btn-accent">Book a new trip</Link>
          <form action={customerLogoutAction}><button className="btn bg-white/10 text-white hover:bg-white/20">Sign out</button></form>
        </div>
      </PageHeader>
      <div className="container-x max-w-4xl py-8">
        <Section title="Upcoming trips" bookings={upcoming} empty="No upcoming trips." />
        <Section title="Past & cancelled trips" bookings={past} empty="No past trips yet." />
        <p className="text-sm text-slate-500">Booking cars for your company&apos;s employees? <Link href="/company/login" className="text-primary-700 underline">Corporate sign in</Link>.</p>
      </div>
    </>
  );
}

function Section({ title, bookings, empty }: { title: string; bookings: BookingRow[]; empty: string }) {
  return (
    <section className="mb-8" aria-label={title}>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {bookings.length === 0 ? (
        <p className="card p-5 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/booking/${b.code}`} className="card flex flex-col gap-2 p-4 transition hover:border-primary-300 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm text-slate-500">{b.code}</p>
                  <p className="font-semibold text-slate-900">{b.pickupLocation} → {b.dropLocation}</p>
                  <p className="text-sm text-slate-600">{formatDateTime(b.pickupAt)} · {tripTypeLabel(b.tripType)} · {b.category.name}</p>
                  {b.driver && ["DRIVER_ASSIGNED", "ONGOING"].includes(b.status) && (
                    <p className="mt-1 text-sm text-indigo-800">Driver: <strong>{b.driver.name}</strong> ({b.driver.phone}){b.vehicle && ` · ${b.vehicle.model} ${b.vehicle.registrationNumber}`}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <StatusBadge status={b.status} />
                  <span className="font-semibold">{formatINR(b.finalFare ?? b.estimatedFare)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
