import type { Metadata } from "next";
import Link from "next/link";
import { loadTripContext } from "@/lib/services/trip-context";
import { getBookingOptions, quoteAllCategories } from "@/lib/services/pricing";
import { tripSearchToQuery } from "@/lib/validation/booking";
import { formatINR } from "@/lib/format";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { TripSummary } from "@/components/booking/TripSummary";
import { FareBreakdownView, PaymentNote } from "@/components/booking/FareBreakdownView";
import { CarImage, CarSpecs } from "@/components/site/CarCard";

export const metadata: Metadata = { title: "Select Car", robots: { index: false } };

export default async function SelectCarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadTripContext(await searchParams);

  if (!ctx.ok) {
    const options = await getBookingOptions();
    return (
      <div className="container-x max-w-3xl py-10">
        <h1 className="text-2xl font-bold text-slate-900">Plan your trip</h1>
        <p role="alert" className="mt-2 mb-6 rounded-lg bg-amber-50 px-4 py-3 text-amber-900">{ctx.message}</p>
        <BookingWidget options={options} advanceHours={ctx.settings.advanceBookingHours} initial={ctx.raw} />
      </div>
    );
  }

  const quotes = await quoteAllCategories(ctx.trip, ctx.settings, ctx.timing.days);
  const query = tripSearchToQuery(ctx.trip.search);

  return (
    <div className="container-x py-8">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Select your car</h1>
      <div className="mt-4"><TripSummary trip={ctx.trip} timing={ctx.timing} /></div>

      {quotes.length === 0 ? (
        <p className="card mt-6 p-6 text-slate-700">
          No cars are priced for this trip yet. Please <Link href="/contact" className="text-primary-700 underline">contact us</Link> for a quote.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {quotes.map(({ category, fare }) => (
            <li key={category.id} className="card flex flex-col gap-4 p-4 sm:flex-row">
              <div className="sm:w-48 sm:shrink-0"><CarImage car={category} /></div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{category.name}</h2>
                    <p className="text-sm text-slate-500">{category.exampleModels} or similar</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-800">{formatINR(fare.total)}</p>
                    <p className="text-xs text-slate-500">incl. {fare.gstPercent}% GST</p>
                  </div>
                </div>
                <div className="mt-2"><CarSpecs car={category} /></div>
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer font-medium text-primary-700">Fare details</summary>
                  <div className="mt-2 rounded-lg bg-slate-50 p-3"><FareBreakdownView fare={fare} title="Fare breakdown" showNote={false} /></div>
                </details>
                <div className="mt-auto pt-3">
                  <Link href={`/book?${query}&car=${category.slug}`} className="btn-primary w-full sm:w-auto">
                    Select {category.name}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6"><PaymentNote /></div>
    </div>
  );
}
