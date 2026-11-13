import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { loadTripContext } from "@/lib/services/trip-context";
import { quoteCategory } from "@/lib/services/pricing";
import { tripSearchToQuery } from "@/lib/validation/booking";
import { TripSummary } from "@/components/booking/TripSummary";
import { FareBreakdownView } from "@/components/booking/FareBreakdownView";
import { BookingForm } from "@/components/booking/BookingForm";
import { getCurrentCustomer } from "@/lib/auth/customer-session";
import { CarImage, CarSpecs } from "@/components/site/CarCard";

export const metadata: Metadata = { title: "Booking Details", robots: { index: false } };

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  // Browsing is open, but confirming a booking needs an account
  const customer = await getCurrentCustomer();
  if (!customer) {
    const back = `/book?${new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"))}`;
    redirect(`/account/login?next=${encodeURIComponent(back)}`);
  }
  const ctx = await loadTripContext(params);
  if (!ctx.ok) redirect(`/select-car?${new URLSearchParams(ctx.raw)}`);

  const carSlug = typeof params.car === "string" ? params.car : "";
  const category = carSlug ? await prisma.carCategory.findFirst({ where: { slug: carSlug, active: true } }) : null;
  const fare = category ? await quoteCategory(ctx.trip, category, ctx.settings, ctx.timing.days) : null;
  const backToCars = `/select-car?${tripSearchToQuery(ctx.trip.search)}`;

  if (!category || !fare) {
    return (
      <div className="container-x py-10">
        <p className="card p-6">
          This car is not available for the selected trip. <Link href={backToCars} className="text-primary-700 underline">Choose another car</Link>.
        </p>
      </div>
    );
  }

  const { trip } = ctx;
  const isAirportPickup = trip.tripType === "AIRPORT" && trip.airportDirection === "PICKUP";
  const isAirportDrop = trip.tripType === "AIRPORT" && trip.airportDirection === "DROP";

  return (
    <div className="container-x py-8">
      <nav aria-label="Progress" className="mb-4 text-sm text-slate-500">
        <Link href={`/?${tripSearchToQuery(trip.search)}#book`} className="hover:underline">Trip</Link> ›{" "}
        <Link href={backToCars} className="hover:underline">Car</Link> › <span className="font-semibold text-slate-900">Details</span>
      </nav>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Booking details</h1>
      <div className="mt-4"><TripSummary trip={trip} timing={ctx.timing} /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="card p-5" aria-labelledby="your-details">
          <h2 id="your-details" className="mb-4 text-lg font-semibold">Your details</h2>
          <BookingForm
            trip={trip.search}
            car={category.slug}
            seats={category.seats}
            advanceHours={ctx.settings.advanceBookingHours}
            pickupLabel={isAirportPickup ? "terminal / flight no." : isAirportDrop ? trip.zone!.name : trip.pickupLocation}
            dropLabel={isAirportDrop ? trip.airport!.shortName : isAirportPickup ? trip.zone!.name : trip.tripType === "LOCAL" ? "" : trip.dropLocation}
            dropRequired={isAirportPickup}
            defaults={{ customerName: customer.name, customerMobile: customer.mobile, customerEmail: customer.email ?? "" }}
          />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-4">
            <div className="flex gap-3">
              <div className="w-28 shrink-0"><CarImage car={category} /></div>
              <div>
                <p className="font-semibold text-slate-900">{category.name}</p>
                <p className="text-xs text-slate-500">{category.exampleModels} or similar</p>
                <div className="mt-1"><CarSpecs car={category} /></div>
              </div>
            </div>
            <Link href={backToCars} className="mt-3 inline-block text-sm text-primary-700 hover:underline">Change car</Link>
          </div>
          <div className="card p-4"><FareBreakdownView fare={fare} /></div>
        </aside>
      </div>
    </div>
  );
}
