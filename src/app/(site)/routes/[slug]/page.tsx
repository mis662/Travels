import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import { getBookingOptions, routeFareTable } from "@/lib/services/pricing";
import { formatINR } from "@/lib/format";
import { hourLabel } from "@/lib/fare/engine";
import { siteConfig } from "@/config/site";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { PaymentNote } from "@/components/booking/FareBreakdownView";
import { PageHeader } from "@/components/site/PageHeader";
import { Faq } from "@/components/site/Faq";
import { JsonLd } from "@/components/site/JsonLd";
import { CtaBand } from "@/components/site/CtaBand";

const getRoute = cache((slug: string) => prisma.route.findFirst({ where: { slug, active: true } }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const route = await getRoute((await params).slug);
  if (!route) notFound(); // here (not only in the page) so the response is a real 404
  const title = route.seoTitle || `Mumbai to ${route.toCity} Cab`;
  const description = route.seoDescription || `Book a Mumbai to ${route.toCity} taxi. ${route.distanceKm} km, ${route.durationText}.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/routes/${route.slug}` },
    openGraph: { title, description, url: `/routes/${route.slug}`, type: "website" },
  };
}

export default async function RouteLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const route = await getRoute((await params).slug);
  if (!route) notFound();
  const settings = await getSettings();
  const [options, table, others] = await Promise.all([
    getBookingOptions(),
    routeFareTable(route, settings),
    prisma.route.findMany({ where: { active: true, id: { not: route.id } }, orderBy: { sortOrder: "asc" }, take: 6 }),
  ]);
  const minOneWay = Math.min(...table.map((t) => t.oneWay));

  const faqs = [
    { q: `What is the distance from Mumbai to ${route.toCity}?`, a: `The road distance from Mumbai to ${route.toCity} is about ${route.distanceKm} km and takes around ${route.durationText || "a few hours"} depending on traffic.` },
    { q: `What is the Mumbai to ${route.toCity} cab fare?`, a: `One way cab fares start from ${formatINR(minOneWay)} including GST. Toll, parking and state tax are extra as actual. Select your car to see the exact fare breakdown.` },
    { q: "Do I have to pay in advance?", a: siteConfig.paymentNote },
    { q: "Can I book a round trip?", a: `Yes. Round trips are charged on a minimum of ${settings.minKmPerDay} km per day plus driver allowance. Choose “Round Trip” in the booking form.` },
  ];

  return (
    <>
      <PageHeader title={`Mumbai to ${route.toCity} Cab`} subtitle={`${route.distanceKm} km · ${route.durationText} · One way & round trip · Pay after your trip`} />
      <nav aria-label="Breadcrumb" className="container-x pt-4 text-sm text-slate-500">
        <Link href="/" className="hover:underline">Home</Link> › <Link href="/routes" className="hover:underline">Routes</Link> › <span className="text-slate-800">Mumbai to {route.toCity}</span>
      </nav>

      <div className="container-x grid gap-8 py-8 lg:grid-cols-[1fr_440px]">
        <div>
          {route.description && <p className="text-lg leading-relaxed text-slate-700">{route.description}</p>}
          <h2 className="mt-8 text-xl font-bold text-slate-900">Mumbai to {route.toCity} taxi fare</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr><th className="p-3">Car</th><th className="p-3">Seats</th><th className="p-3">One way</th><th className="p-3">Round trip</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.map((row) => (
                  <tr key={row.category.id}>
                    <td className="p-3"><span className="font-medium">{row.category.name}</span><span className="block text-xs text-slate-500">{row.category.exampleModels}</span></td>
                    <td className="p-3">{row.category.seats}</td>
                    <td className="p-3 font-semibold">{formatINR(row.oneWay)}</td>
                    <td className="p-3 font-semibold">{formatINR(row.round)}<span className="block text-xs font-normal text-slate-500">{row.roundDays} day{row.roundDays > 1 ? "s" : ""}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Estimated fares including {settings.gstPercent}% GST for a daytime pickup. Toll, parking and state tax extra as actual. Night charge may apply between {hourLabel(settings.nightStartHour)} and {hourLabel(settings.nightEndHour)}.
          </p>
          <PaymentNote />
        </div>
        <div id="book" className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
          <BookingWidget options={options} advanceHours={settings.advanceBookingHours} initial={{ type: "oneway", route: route.slug }} compact />
        </div>
      </div>

      <Faq items={faqs} title={`Mumbai to ${route.toCity} cab – FAQs`} />

      {others.length > 0 && (
        <section className="container-x">
          <h2 className="text-xl font-bold text-slate-900">Other routes</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => (
              <Link key={o.id} href={`/routes/${o.slug}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:border-primary-400">Mumbai to {o.toCity}</Link>
            ))}
          </div>
        </section>
      )}
      <CtaBand />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
            { "@type": "ListItem", position: 2, name: "Routes", item: `${siteConfig.url}/routes` },
            { "@type": "ListItem", position: 3, name: `Mumbai to ${route.toCity}`, item: `${siteConfig.url}/routes/${route.slug}` },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TaxiService",
          name: `Mumbai to ${route.toCity} Cab`,
          provider: { "@type": "LocalBusiness", name: settings.businessName, telephone: settings.phonePrimary },
          areaServed: ["Mumbai", route.toCity],
          offers: Number.isFinite(minOneWay) ? { "@type": "Offer", priceCurrency: "INR", price: minOneWay, description: "One way, starting price incl. GST" } : undefined,
        }}
      />
    </>
  );
}
