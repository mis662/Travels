import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import { getBookingOptions } from "@/lib/services/pricing";
import { formatINR } from "@/lib/format";
import { services, serviceSlugs, type ServiceSlug } from "@/config/services";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { PageHeader } from "@/components/site/PageHeader";
import { CarCard } from "@/components/site/CarCard";
import { Faq } from "@/components/site/Faq";
import { CtaBand } from "@/components/site/CtaBand";
import { ContactForm } from "@/components/site/ContactForm";
import { CheckIcon } from "@/components/ui/icons";

export function generateStaticParams() {
  return serviceSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = services[(await params).slug as ServiceSlug];
  if (!s) notFound(); // here (not only in the page) so the response is a real 404
  return {
    title: { absolute: s.metaTitle },
    description: s.metaDescription,
    alternates: { canonical: `/services/${s.slug}` },
    openGraph: { title: s.metaTitle, description: s.metaDescription, url: `/services/${s.slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const service = services[(await params).slug as ServiceSlug];
  if (!service) notFound();

  const [settings, options, categories] = await Promise.all([
    getSettings(),
    getBookingOptions(),
    prisma.carCategory.findMany({
      where: { active: true, ...(service.categories ? { slug: { in: service.categories } } : {}) },
      orderBy: { sortOrder: "asc" },
      include: { localFares: { include: { package: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader title={service.title} subtitle={service.intro} />

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[1fr_440px]">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Why book with {settings.businessName}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {service.features.map((f) => (
              <li key={f} className="flex gap-2 text-slate-700"><CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /> {f}</li>
            ))}
          </ul>
          <PriceInfo slug={service.slug} />
        </div>
        <div id="book" className="scroll-mt-20">
          {service.widget ? (
            <BookingWidget options={options} advanceHours={settings.advanceBookingHours} initial={{ type: service.widget }} compact />
          ) : (
            <div className="card p-5">
              <h2 className="mb-4 text-lg font-semibold">Get a quote</h2>
              <ContactForm defaultSubject={service.title} />
            </div>
          )}
        </div>
      </div>

      <section className="container-x">
        <h2 className="text-xl font-bold text-slate-900">Cars available</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => {
            const local = c.localFares.sort((a, b) => a.package.sortOrder - b.package.sortOrder)[0];
            return (
              <CarCard key={c.id} car={c}>
                <p className="text-sm text-slate-600">
                  {service.slug === "local-rental" && local
                    ? <>From <strong>{formatINR(local.price)}</strong> / {local.package.name}</>
                    : <>Outstation <strong>₹{c.perKmRate}/km</strong></>}
                </p>
              </CarCard>
            );
          })}
        </div>
      </section>

      <Faq items={service.faqs} title={`${service.title.split("–")[0].trim()} – FAQs`} />
      <CtaBand />
    </>
  );
}

async function PriceInfo({ slug }: { slug: ServiceSlug }) {
  if (slug === "airport-transfer") {
    const sedan = await prisma.carCategory.findFirst({ where: { slug: "sedan" } });
    const fares = sedan
      ? await prisma.airportFare.findMany({ where: { categoryId: sedan.id, zone: { active: true }, airport: { active: true } }, include: { zone: true, airport: true }, orderBy: [{ airport: { sortOrder: "asc" } }, { zone: { sortOrder: "asc" } }] })
      : [];
    const bom = fares.filter((f) => f.airport.slug === "csmia-t1");
    const nmi = fares.filter((f) => f.airport.slug === "navi-mumbai-airport");
    if (!bom.length && !nmi.length) return null;
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-900">Sedan airport fares</h2>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="p-3">Zone</th><th className="p-3">Mumbai Airport (T1/T2)</th><th className="p-3">Navi Mumbai Airport</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {bom.map((f) => (
                <tr key={f.id}>
                  <td className="p-3">{f.zone.name}<span className="block text-xs text-slate-500">{f.zone.areas}</span></td>
                  <td className="p-3 font-semibold">{formatINR(f.fare)}</td>
                  <td className="p-3 font-semibold">{nmi.find((n) => n.zoneId === f.zoneId) ? formatINR(nmi.find((n) => n.zoneId === f.zoneId)!.fare) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Before GST. Parking & toll extra. Select your car on the next step for exact fares.</p>
      </div>
    );
  }
  if (slug === "outstation" || slug === "tempo-traveller") {
    const routes = await prisma.route.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-900">Popular destinations from Mumbai</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {routes.map((r) => (
            <li key={r.id}>
              <Link href={`/routes/${r.slug}`} className="card flex justify-between p-3 text-sm hover:border-primary-300">
                <span className="font-medium">Mumbai → {r.toCity}</span>
                <span className="text-slate-500">{r.distanceKm} km</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}
