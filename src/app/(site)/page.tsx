import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import { getBookingOptions } from "@/lib/services/pricing";
import { formatINR, telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { CarCard } from "@/components/site/CarCard";
import { Faq, generalFaqs } from "@/components/site/Faq";
import { CtaBand } from "@/components/site/CtaBand";
import { CheckIcon, PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";

const reasons = [
  { title: "Transparent fares", text: "See the full fare breakdown before you book. No hidden charges." },
  { title: "Pay after the trip", text: "No advance payment. Pay the driver or our office by cash or UPI." },
  { title: "Verified drivers", text: "Experienced, police-verified drivers who know Mumbai and the ghats." },
  { title: "Clean AC cars", text: "Well-maintained, sanitised cars with valid permits and insurance." },
  { title: "24×7 support", text: "Call or WhatsApp us anytime — before, during or after your trip." },
  { title: "On-time pickups", text: "Flight tracking for airport pickups and punctual outstation departures." },
];

const testimonials = [
  { name: "Customer name", place: "Andheri", text: "Your customer testimonial goes here. Edit this in src/app/(site)/page.tsx." },
  { name: "Customer name", place: "Thane", text: "Your customer testimonial goes here. Add real reviews from Google or WhatsApp." },
  { name: "Customer name", place: "Navi Mumbai", text: "Your customer testimonial goes here. Short, specific reviews work best." },
];

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // "Modify" from the Select Car page comes back here with the previous search in the URL.
  const initial = Object.fromEntries(
    Object.entries(await searchParams).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  const [settings, options, categories, popular] = await Promise.all([
    getSettings(),
    getBookingOptions(),
    prisma.carCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.route.findMany({ where: { active: true, popular: true }, orderBy: { sortOrder: "asc" }, take: 6 }),
  ]);
  const minRate = (km: number) => Math.min(...categories.map((c) => Math.max(c.baseFare, Math.max(km, settings.oneWayMinKm) * c.perKmRate)));

  return (
    <>
      <section id="book" className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 text-white">
        <div className="absolute inset-0 opacity-10 [background-image:repeating-linear-gradient(45deg,#facc15_0_2px,transparent_2px_24px)]" aria-hidden="true" />
        <div className="container-x relative grid items-center gap-8 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="inline-block rounded-full bg-accent-400 px-3 py-1 text-xs font-bold text-primary-950 uppercase">Mumbai&apos;s trusted cab service</p>
            <h1 className="mt-4 text-3xl leading-tight font-extrabold sm:text-5xl">
              Airport, Local &amp; Outstation Cabs in <span className="text-accent-400">Mumbai</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-slate-200">
              Instant fare estimate, verified drivers and clean AC cars. Book now — pay after your trip.
            </p>
            <ul className="mt-6 hidden max-w-md gap-2 text-sm sm:grid sm:grid-cols-2">
              {["No advance payment", "Transparent fares", "24×7 support", "Sedan to Mini Bus"].map((x) => (
                <li key={x} className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-accent-400" /> {x}</li>
              ))}
            </ul>
            {/* Hidden on mobile: the sticky Call/WhatsApp bar covers it, and the booking widget comes sooner */}
            <div className="mt-6 hidden flex-wrap gap-3 sm:flex">
              <a href={telHref(settings.phonePrimary)} className="btn bg-white text-primary-900 hover:bg-slate-100">
                <PhoneIcon className="h-4 w-4" /> {settings.phonePrimary}
              </a>
              <a href={waLink(settings.whatsappPrimary, "Hi, I want to book a cab.")} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
          <BookingWidget options={options} advanceHours={settings.advanceBookingHours} initial={initial} />
        </div>
      </section>

      <section className="container-x py-12" aria-labelledby="cars-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="cars-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">Choose your ride</h2>
            <p className="mt-1 text-slate-600">From budget hatchbacks to luxury sedans and 35-seater buses.</p>
          </div>
          <Link href="/fleet" className="hidden text-sm font-semibold text-primary-700 hover:underline sm:block">View full fleet →</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 8).map((c) => (
            <CarCard key={c.id} car={c}>
              <p className="text-sm text-slate-600">Outstation from <strong className="text-slate-900">₹{c.perKmRate}/km</strong></p>
            </CarCard>
          ))}
        </div>
      </section>

      <section className="bg-white py-12" aria-labelledby="routes-title">
        <div className="container-x">
          <h2 id="routes-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">Popular outstation routes</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((r) => (
              <Link key={r.id} href={`/routes/${r.slug}`} className="card group flex items-center justify-between p-5 transition hover:border-primary-300 hover:shadow-md">
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-primary-800">Mumbai → {r.toCity}</p>
                  <p className="text-sm text-slate-500">{r.distanceKm} km · {r.durationText}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">One way from</p>
                  <p className="font-bold text-primary-800">{formatINR(minRate(r.distanceKm))}*</p>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">*Before GST. Toll, parking &amp; state tax extra. <Link href="/routes" className="underline">All routes</Link></p>
        </div>
      </section>

      <section className="container-x py-12" aria-labelledby="why-title">
        <h2 id="why-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">Why choose {settings.businessName}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => (
            <div key={r.title} className="card p-5">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-accent-100 text-accent-700"><CheckIcon /></div>
              <h3 className="font-semibold text-slate-900">{r.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-12" aria-labelledby="reviews-title">
        <div className="container-x">
          <h2 id="reviews-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">What our customers say</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <figure key={i} className="card p-5">
                <p className="text-accent-500" aria-label="5 out of 5 stars">★★★★★</p>
                <blockquote className="mt-2 text-slate-700">&ldquo;{t.text}&rdquo;</blockquote>
                <figcaption className="mt-3 text-sm font-semibold text-slate-900">{t.name}, <span className="font-normal text-slate-500">{t.place}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <Faq items={generalFaqs(settings)} />
      <CtaBand />
    </>
  );
}
