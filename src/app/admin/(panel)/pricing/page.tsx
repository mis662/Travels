import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/services/settings";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageTitle, Panel, Table } from "@/components/admin/ui";
import {
  saveAirportFaresAction,
  saveChargesAction,
  saveLocalFaresAction,
  savePackageAction,
  saveZoneAction,
} from "@/actions/admin/pricing";

export const metadata = { title: "Cars & Pricing" };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ airport?: string }> }) {
  await requireSuperAdmin();
  const { airport: airportSlug } = await searchParams;
  const [settings, categories, packages, localFares, airports, zones] = await Promise.all([
    getSettings(),
    prisma.carCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.localPackage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.localPackageFare.findMany(),
    prisma.airport.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.airportZone.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const airport = airports.find((a) => a.slug === airportSlug) ?? airports[0];
  const airportFares = airport ? await prisma.airportFare.findMany({ where: { airportId: airport.id } }) : [];
  const localMap = new Map(localFares.map((f) => [`${f.packageId}:${f.categoryId}`, f.price]));
  const airportMap = new Map(airportFares.map((f) => [`${f.zoneId}:${f.categoryId}`, f.fare]));
  const cellInput = "w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm";

  return (
    <>
      <PageTitle title="Cars & Pricing" />
      <nav className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Sections">
        {[["#charges", "Charges & GST"], ["#categories", "Car categories"], ["#local", "Local packages"], ["#airport", "Airport fares"]].map(([h, l]) => (
          <a key={h} href={h} className="rounded-full bg-white px-3 py-1 shadow-sm hover:bg-slate-50">{l}</a>
        ))}
      </nav>

      <Panel title="Charges & GST" className="scroll-mt-4">
        <div id="charges" />
        <ActionForm action={saveChargesAction} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Num name="nightCharge" label="Night charge (₹)" value={settings.nightCharge} />
          <Num name="nightStartHour" label="Night starts (hour 0-23)" value={settings.nightStartHour} max={23} />
          <Num name="nightEndHour" label="Night ends (hour 0-23)" value={settings.nightEndHour} max={23} />
          <Num name="gstPercent" label="GST %" value={settings.gstPercent} step="0.5" max={28} />
          <Num name="minKmPerDay" label="Round trip min km/day" value={settings.minKmPerDay} />
          <Num name="oneWayMinKm" label="One-way minimum km" value={settings.oneWayMinKm} />
          <div className="sm:col-span-3 lg:col-span-6"><Submit>Save charges</Submit></div>
        </ActionForm>
        <p className="mt-3 text-xs text-slate-500">
          Toll, parking and state tax are always shown to customers as “extra as actual”. Round trip = max(actual km, min km/day × days) × per-km rate + driver allowance × days.
          One way = max(route km, one-way minimum km) × per-km rate. Outstation fares never go below the category&apos;s minimum fare.
        </p>
      </Panel>

      <div id="categories" className="mt-8 scroll-mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Car categories</h2>
          <Link href="/admin/pricing/categories/new" className="btn-primary">New category</Link>
        </div>
        <Table head={["Category", "Seats", "Bags", "AC", "₹/km", "Min fare", "Driver/day", "Local extra km / hr", "Status", ""]}>
          {categories.map((c) => (
            <tr key={c.id} className={c.active ? "" : "opacity-60"}>
              <td className="px-3 py-2"><strong>{c.name}</strong><br /><span className="text-xs text-slate-500">{c.exampleModels}</span></td>
              <td className="px-3 py-2">{c.seats}</td>
              <td className="px-3 py-2">{c.luggage}</td>
              <td className="px-3 py-2">{c.ac ? "Yes" : "No"}</td>
              <td className="px-3 py-2">₹{c.perKmRate}</td>
              <td className="px-3 py-2">₹{c.baseFare}</td>
              <td className="px-3 py-2">₹{c.driverAllowancePerDay}</td>
              <td className="px-3 py-2">₹{c.localExtraKmRate} / ₹{c.localExtraHourRate}</td>
              <td className="px-3 py-2">{c.active ? "Active" : "Inactive"}</td>
              <td className="px-3 py-2"><Link href={`/admin/pricing/categories/${c.id}`} className="text-primary-700 underline">Edit</Link></td>
            </tr>
          ))}
        </Table>
      </div>

      <Panel title="Local rental package prices (₹)" className="mt-8 scroll-mt-4">
        <div id="local" />
        <ActionForm action={saveLocalFaresAction}>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead><tr><th className="p-2 text-left">Package</th>{categories.map((c) => <th key={c.id} className="p-2 text-right whitespace-nowrap">{c.name}</th>)}</tr></thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id} className={p.active ? "" : "opacity-60"}>
                    <td className="p-2 font-medium whitespace-nowrap">{p.name}</td>
                    {categories.map((c) => (
                      <td key={c.id} className="p-1 text-right">
                        <input name={`fare:${p.id}:${c.id}`} defaultValue={localMap.get(`${p.id}:${c.id}`) ?? ""} inputMode="numeric" className={cellInput} aria-label={`${p.name} ${c.name}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">Leave a cell empty if the car is not offered for that package. Extra km/hour rates are set per category.</p>
          <Submit>Save local prices</Submit>
        </ActionForm>

        <h3 className="mt-6 mb-2 text-sm font-semibold">Packages</h3>
        <div className="space-y-2">
          {packages.map((p) => (
            <ActionForm key={p.id} action={savePackageAction} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={p.id} />
              <input name="name" defaultValue={p.name} className="input w-40" aria-label="Package name" />
              <input name="hours" type="number" defaultValue={p.hours} className="input w-20" aria-label="Hours" /> hr
              <input name="km" type="number" defaultValue={p.km} className="input w-24" aria-label="Km" /> km
              <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={p.active} /> Active</label>
              <Submit className="btn-outline py-1.5">Save</Submit>
            </ActionForm>
          ))}
          <ActionForm action={savePackageAction} className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-sm" resetOnSuccess>
            <input name="name" placeholder="e.g. 6 hr / 60 km" className="input w-40" aria-label="New package name" />
            <input name="hours" type="number" placeholder="6" className="input w-20" aria-label="Hours" /> hr
            <input name="km" type="number" placeholder="60" className="input w-24" aria-label="Km" /> km
            <input type="hidden" name="active" value="on" />
            <Submit className="btn-outline py-1.5">Add package</Submit>
          </ActionForm>
        </div>
      </Panel>

      <Panel title="Airport transfer fares (₹, fixed per zone)" className="mt-8 scroll-mt-4">
        <div id="airport" />
        <div className="mb-3 flex flex-wrap gap-2">
          {airports.map((a) => (
            <Link key={a.id} href={`/admin/pricing?airport=${a.slug}#airport`} className={`rounded-full px-3 py-1 text-sm ${a.id === airport?.id ? "bg-primary-800 text-white" : "bg-slate-100 hover:bg-slate-200"}`}>
              {a.shortName}
            </Link>
          ))}
        </div>
        {airport && (
          <ActionForm action={saveAirportFaresAction} key={airport.id}>
            <input type="hidden" name="airportId" value={airport.id} />
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead><tr><th className="p-2 text-left">Zone</th>{categories.map((c) => <th key={c.id} className="p-2 text-right whitespace-nowrap">{c.name}</th>)}</tr></thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.id} className={z.active ? "" : "opacity-60"}>
                      <td className="p-2 font-medium whitespace-nowrap">{z.name}</td>
                      {categories.map((c) => (
                        <td key={c.id} className="p-1 text-right">
                          <input name={`fare:${z.id}:${c.id}`} defaultValue={airportMap.get(`${z.id}:${c.id}`) ?? ""} inputMode="numeric" className={cellInput} aria-label={`${z.name} ${c.name}`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">Same fare applies for pickup from and drop to {airport.name}. Empty = not offered.</p>
            <Submit>Save {airport.shortName} fares</Submit>
          </ActionForm>
        )}

        <h3 className="mt-6 mb-2 text-sm font-semibold">Zones</h3>
        <div className="space-y-2">
          {zones.map((z) => (
            <ActionForm key={z.id} action={saveZoneAction} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={z.id} />
              <input name="name" defaultValue={z.name} className="input w-44" aria-label="Zone name" />
              <input name="areas" defaultValue={z.areas} className="input min-w-60 flex-1" aria-label="Example areas" />
              <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={z.active} /> Active</label>
              <Submit className="btn-outline py-1.5">Save</Submit>
            </ActionForm>
          ))}
          <ActionForm action={saveZoneAction} className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-sm" resetOnSuccess>
            <input name="name" placeholder="New zone name" className="input w-44" aria-label="New zone name" />
            <input name="areas" placeholder="Example areas, comma separated" className="input min-w-60 flex-1" aria-label="Example areas" />
            <input type="hidden" name="active" value="on" />
            <Submit className="btn-outline py-1.5">Add zone</Submit>
          </ActionForm>
        </div>
      </Panel>
    </>
  );
}

function Num({ name, label, value, step = "1", max }: { name: string; label: string; value: number; step?: string; max?: number }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type="number" min={0} max={max} step={step} defaultValue={value} className="input" />
    </div>
  );
}
