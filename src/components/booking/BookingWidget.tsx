"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BookingOptions } from "@/lib/services/pricing";
import { tripSearchSchema, tripSearchToQuery, type TripSearch } from "@/lib/validation/booking";
import { fieldErrors } from "@/lib/validation/common";
import { checkTripTiming } from "@/lib/booking/rules";
import { istToday } from "@/lib/time";

type Tab = "airport" | "local" | "outstation";

interface Props {
  options: BookingOptions;
  advanceHours: number;
  initial?: Partial<TripSearch> & Record<string, string>;
  compact?: boolean;
}

export function BookingWidget({ options, advanceHours, initial = {}, compact }: Props) {
  const router = useRouter();
  const initialTab: Tab =
    initial.type === "local" ? "local" : initial.type === "oneway" || initial.type === "round" ? "outstation" : "airport";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [outType, setOutType] = useState<"oneway" | "round">(initial.type === "round" ? "round" : "oneway");
  const [dir, setDir] = useState<"pickup" | "drop">(initial.dir === "drop" ? "drop" : "pickup");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const today = istToday();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    const parsed = tripSearchSchema.safeParse(raw);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const timing = checkTripTiming(parsed.data, advanceHours);
    if (!timing.ok) {
      setErrors(timing.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    router.push(`/select-car?${tripSearchToQuery(parsed.data)}`);
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === t}
      onClick={() => {
        setTab(t);
        setErrors({});
      }}
      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
        tab === t ? "bg-primary-800 text-white shadow" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  const err = (k: string) => errors[k];
  const ctl = (k: string) => ({ id: `w-${k}`, name: k, "aria-invalid": err(k) ? true : undefined, "aria-describedby": `w-${k}-msg` });
  const Msg = ({ k }: { k: string }) =>
    err(k) ? (
      <p id={`w-${k}-msg`} role="alert" className="mt-1 text-xs text-red-600">
        {err(k)}
      </p>
    ) : null;

  const type = tab === "airport" ? "airport" : tab === "local" ? "local" : outType;

  return (
    <div className={`card p-4 text-slate-800 sm:p-5 ${compact ? "" : "shadow-xl"}`}>
      <div role="tablist" aria-label="Trip type" className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabBtn("airport", "Airport")}
        {tabBtn("local", "Local")}
        {tabBtn("outstation", "Outstation")}
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-2" key={tab}>
        <input type="hidden" name="type" value={type} />

        {tab === "airport" && (
          <>
            <fieldset className="sm:col-span-2">
              <legend className="sr-only">Direction</legend>
              <div className="flex gap-2">
                {(["pickup", "drop"] as const).map((d) => (
                  <label key={d} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${dir === d ? "border-primary-700 bg-primary-50 text-primary-900" : "border-slate-300"}`}>
                    <input type="radio" name="dir" value={d} checked={dir === d} onChange={() => setDir(d)} className="sr-only" />
                    {d === "pickup" ? "Pickup from Airport" : "Drop to Airport"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="w-airport" className="label">Airport</label>
              <select {...ctl("airport")} className="input" defaultValue={initial.airport ?? options.airports[0]?.slug}>
                {options.airports.map((a) => (
                  <option key={a.slug} value={a.slug}>{a.name}</option>
                ))}
              </select>
              <Msg k="airport" />
            </div>
            <div>
              <label htmlFor="w-zone" className="label">{dir === "pickup" ? "Drop area" : "Pickup area"}</label>
              <select {...ctl("zone")} className="input" defaultValue={initial.zone ?? ""}>
                <option value="" disabled>Select area</option>
                {options.zones.map((z) => (
                  <option key={z.slug} value={z.slug}>
                    {z.name}{z.areas ? ` (${z.areas})` : ""}
                  </option>
                ))}
              </select>
              <Msg k="zone" />
            </div>
          </>
        )}

        {tab === "local" && (
          <>
            <div>
              <label htmlFor="w-from" className="label">Pickup area in Mumbai</label>
              <input {...ctl("from")} className="input" placeholder="e.g. Andheri East" defaultValue={initial.from ?? ""} maxLength={120} />
              <Msg k="from" />
            </div>
            <div>
              <label htmlFor="w-pkg" className="label">Package</label>
              <select {...ctl("pkg")} className="input" defaultValue={initial.pkg ?? options.packages[1]?.code ?? options.packages[0]?.code}>
                {options.packages.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
              <Msg k="pkg" />
            </div>
          </>
        )}

        {tab === "outstation" && (
          <>
            <fieldset className="sm:col-span-2">
              <legend className="sr-only">Trip</legend>
              <div className="flex gap-2">
                {(["oneway", "round"] as const).map((t) => (
                  <label key={t} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${outType === t ? "border-primary-700 bg-primary-50 text-primary-900" : "border-slate-300"}`}>
                    <input type="radio" name="_out" checked={outType === t} onChange={() => setOutType(t)} className="sr-only" />
                    {t === "oneway" ? "One Way" : "Round Trip"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="w-fromcity" className="label">From</label>
              <input id="w-fromcity" className="input bg-slate-50" value="Mumbai (any area)" readOnly />
            </div>
            <div>
              <label htmlFor="w-route" className="label">To</label>
              <select {...ctl("route")} className="input" defaultValue={initial.route ?? ""}>
                <option value="" disabled>Select destination</option>
                {options.routes.map((r) => (
                  <option key={r.slug} value={r.slug}>{r.toCity} ({r.distanceKm} km)</option>
                ))}
              </select>
              <Msg k="route" />
            </div>
          </>
        )}

        <div>
          <label htmlFor="w-date" className="label">Pickup date</label>
          <input {...ctl("date")} type="date" min={today} className="input" defaultValue={initial.date ?? today} />
          <Msg k="date" />
        </div>
        <div>
          <label htmlFor="w-time" className="label">Pickup time</label>
          <input {...ctl("time")} type="time" className="input" defaultValue={initial.time ?? ""} />
          <Msg k="time" />
        </div>

        {tab === "outstation" && outType === "round" && (
          <div className="sm:col-span-2">
            <label htmlFor="w-ret" className="label">Return date</label>
            <input {...ctl("ret")} type="date" min={today} className="input" defaultValue={initial.ret ?? ""} />
            <Msg k="ret" />
          </div>
        )}

        <div className="sm:col-span-2">
          <button type="submit" className="btn-accent w-full py-3 text-base" disabled={submitting}>
            {submitting ? "Finding cars…" : "Check Fare & Select Car"}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            No advance payment. Book at least {advanceHours} hour{advanceHours === 1 ? "" : "s"} before pickup.
          </p>
        </div>
      </form>
    </div>
  );
}
