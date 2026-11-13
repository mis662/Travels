"use client";

import { useMemo, useState } from "react";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { placeCompanyOrderAction } from "@/actions/company";
import { CORP_TRIP_LABELS, CORP_TRIP_TYPES, ORDER_TYPE_LABELS, ORDER_TYPES, type CorpTripType } from "@/lib/corporate/orders";

interface Props {
  today: string;
  initialTrip?: CorpTripType;
  airports: { slug: string; name: string }[];
  packages: { code: string; name: string }[];
  routes: { slug: string; toCity: string; distanceKm: number }[];
  companyRoutes: { id: string; name: string; fromPlace: string; toPlace: string }[];
  categories: { id: string; name: string; seats: number; luggage: number; exampleModels: string }[];
  employees: { id: string; name: string; employeeCode: string; homeArea: string; department: string }[];
}

interface Car {
  key: number;
  categoryId: string;
  employeeIds: string[];
}

export function CompanyBookingForm({ today, initialTrip = "COMPANY_ROUTE", airports, packages, routes, companyRoutes, categories, employees }: Props) {
  const [tripType, setTripType] = useState<CorpTripType>(initialTrip);
  const [orderType, setOrderType] = useState<string>("DAILY");
  const [cars, setCars] = useState<Car[]>([{ key: 1, categoryId: categories[0]?.id ?? "", employeeIds: [] }]);
  const [filter, setFilter] = useState("");
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const assigned = new Set(cars.flatMap((c) => c.employeeIds));

  const update = (key: number, fn: (c: Car) => Car) => setCars((cs) => cs.map((c) => (c.key === key ? fn(c) : c)));
  const toggle = (car: Car, id: string) =>
    update(car.key, (c) => ({ ...c, employeeIds: c.employeeIds.includes(id) ? c.employeeIds.filter((x) => x !== id) : [...c.employeeIds, id] }));
  const addCar = () => setCars((cs) => [...cs, { key: Math.max(...cs.map((c) => c.key)) + 1, categoryId: cs.at(-1)?.categoryId ?? categories[0]?.id ?? "", employeeIds: [] }]);
  const removeCar = (key: number) => setCars((cs) => (cs.length > 1 ? cs.filter((c) => c.key !== key) : cs));

  const q = filter.trim().toLowerCase();
  const matches = (e: Props["employees"][number]) =>
    !q || [e.name, e.employeeCode, e.homeArea, e.department].some((v) => v.toLowerCase().includes(q));
  const totalPeople = cars.reduce((n, c) => n + c.employeeIds.length, 0);

  return (
    <ActionForm action={placeCompanyOrderAction} className="space-y-6">
      <input type="hidden" name="tripType" value={tripType} />
      <input type="hidden" name="cars" value={JSON.stringify(cars.map(({ categoryId, employeeIds }) => ({ categoryId, employeeIds })))} />

      {/* 1. Trip */}
      <section className="card p-5">
        <h2 className="mb-3 font-semibold">1. Trip</h2>
        <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:grid-cols-4">
          {CORP_TRIP_TYPES.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tripType === t} onClick={() => setTripType(t)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${tripType === t ? "bg-primary-800 text-white shadow" : "text-slate-600 hover:bg-white"}`}>
              {CORP_TRIP_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {tripType === "AIRPORT" && (
            <>
              <L label="Airport" htmlFor="airportSlug">
                <select id="airportSlug" name="airportSlug" className="input">{airports.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select>
              </L>
              <L label="Direction" htmlFor="airportDirection">
                <select id="airportDirection" name="airportDirection" className="input">
                  <option value="DROP">Drop employees to airport</option>
                  <option value="PICKUP">Pick up employees from airport</option>
                </select>
              </L>
            </>
          )}
          {tripType === "LOCAL" && (
            <L label="Local package" htmlFor="packageCode">
              <select id="packageCode" name="packageCode" className="input">{packages.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select>
            </L>
          )}
          {tripType === "OUTSTATION" && (
            <>
              <L label="Destination" htmlFor="routeSlug">
                <select id="routeSlug" name="routeSlug" className="input">{routes.map((r) => <option key={r.slug} value={r.slug}>Mumbai → {r.toCity} ({r.distanceKm} km)</option>)}</select>
              </L>
              <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="roundTrip" className="h-4 w-4" /> Round trip (car waits and returns)</label>
            </>
          )}
          {tripType === "COMPANY_ROUTE" && (
            companyRoutes.length ? (
              <L label="Your route" htmlFor="companyRouteId" wide>
                <select id="companyRouteId" name="companyRouteId" className="input">
                  {companyRoutes.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.fromPlace} → {r.toPlace}</option>)}
                </select>
              </L>
            ) : (
              <p className="text-sm text-amber-800 sm:col-span-2">You have no routes yet. Add them on the <a className="underline" href="/company/routes">Routes</a> page (e.g. &ldquo;Employees&apos; homes → Office&rdquo;).</p>
            )
          )}
        </div>
      </section>

      {/* 2. When */}
      <section className="card p-5">
        <h2 className="mb-3 font-semibold">2. When</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <L label="Booking for" htmlFor="orderType">
            <select id="orderType" name="orderType" className="input" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
              {ORDER_TYPES.map((t) => <option key={t} value={t}>{ORDER_TYPE_LABELS[t]}</option>)}
            </select>
          </L>
          <L label={orderType === "TRIP" ? "Date" : "From date"} htmlFor="startDate"><input id="startDate" name="startDate" type="date" min={today} defaultValue={today} className="input" /></L>
          {orderType !== "TRIP" && <L label="To date" htmlFor="endDate"><input id="endDate" name="endDate" type="date" min={today} className="input" /></L>}
          <L label="Pickup time" htmlFor="reportingTime"><input id="reportingTime" name="reportingTime" type="time" defaultValue="08:30" className="input" /></L>
        </div>
        {orderType !== "TRIP" && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="skipSundays" defaultChecked className="h-4 w-4" /> No cars on Sundays</label>}
      </section>

      {/* 3. Cars & who rides together */}
      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">3. Cars &amp; who rides together</h2>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search employees by name, code, area…" className="input max-w-xs" aria-label="Search employees" />
        </div>
        {employees.length === 0 && <p className="mb-3 text-sm text-amber-800">Add employees first on the <a className="underline" href="/company/employees">Employees</a> page.</p>}
        <div className="space-y-4">
          {cars.map((car, idx) => {
            const cat = catById.get(car.categoryId);
            const full = cat ? car.employeeIds.length >= cat.seats : false;
            return (
              <div key={car.key} className="rounded-xl border border-slate-200 p-4" data-testid={`car-${idx + 1}`}>
                <div className="flex flex-wrap items-end gap-3">
                  <p className="text-lg font-bold text-primary-900">Car {idx + 1}</p>
                  <L label="Car type" htmlFor={`cat-${car.key}`}>
                    <select id={`cat-${car.key}`} className="input" value={car.categoryId}
                      onChange={(e) => update(car.key, (c) => ({ ...c, categoryId: e.target.value, employeeIds: c.employeeIds.slice(0, catById.get(e.target.value)?.seats ?? c.employeeIds.length) }))}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.seats} seater ({c.exampleModels})</option>)}
                    </select>
                  </L>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${full ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>
                    {car.employeeIds.length} / {cat?.seats ?? "?"} seats
                  </span>
                  {cars.length > 1 && <button type="button" onClick={() => removeCar(car.key)} className="ml-auto text-sm text-red-700 hover:underline">Remove car</button>}
                </div>
                {car.employeeIds.length > 0 && (
                  <p className="mt-3 text-sm"><span className="text-slate-500">Riding together:</span> {car.employeeIds.map((id) => empById.get(id)?.name).join(", ")}</p>
                )}
                <div className="mt-3 grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {employees.filter((e) => car.employeeIds.includes(e.id) || (!assigned.has(e.id) && matches(e))).map((e) => {
                    const checked = car.employeeIds.includes(e.id);
                    return (
                      <label key={e.id} className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-sm ${checked ? "border-primary-400 bg-primary-50" : "border-slate-200"} ${!checked && full ? "cursor-not-allowed opacity-50" : ""}`}>
                        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} disabled={!checked && full} onChange={() => toggle(car, e.id)} />
                        <span>{e.name}{e.employeeCode && <span className="text-slate-500"> · {e.employeeCode}</span>}<span className="block text-xs text-slate-500">{[e.homeArea, e.department].filter(Boolean).join(" · ")}</span></span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={addCar} className="btn-outline mt-4">+ Add another car</button>
        <p className="mt-3 text-sm text-slate-600"><strong>{cars.length}</strong> car{cars.length > 1 ? "s" : ""} · <strong>{totalPeople}</strong> employee{totalPeople === 1 ? "" : "s"}</p>
      </section>

      <section className="card p-5">
        <L label="Notes for us (optional)" htmlFor="requirements">
          <textarea id="requirements" name="requirements" rows={3} maxLength={1000} className="input" placeholder="Uniformed chauffeur, lady escort for late shifts, flight numbers…" />
        </L>
      </section>

      <Submit className="btn-accent w-full py-3 text-base">Place booking</Submit>
    </ActionForm>
  );
}

function L({ label, htmlFor, children, wide }: { label: string; htmlFor: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
    </div>
  );
}
