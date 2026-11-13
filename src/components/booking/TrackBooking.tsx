"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { manageBookingAction, type TrackState } from "@/actions/track";
import { BOOKING_STATUSES, STATUS_COLORS, statusLabel, tripTypeLabel, type BookingStatus } from "@/lib/booking/status";
import { formatDate, formatDateTime, formatINR, telHref } from "@/lib/format";
import { aria, Field, FormMessage } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FareBreakdownView } from "./FareBreakdownView";

const PROGRESS: BookingStatus[] = BOOKING_STATUSES.filter((s) => s !== "CANCELLED");

export function TrackBooking({ initialCode = "" }: { initialCode?: string }) {
  const [state, action] = useActionState<TrackState, FormData>(manageBookingAction, {});
  const [confirming, setConfirming] = useState(false);
  const b = state.booking;
  // Lookup errors show on the search form; cancel errors show next to the booking
  const errors = b ? {} : (state.errors ?? {});
  const live = b && !["COMPLETED", "CANCELLED"].includes(b.status);

  // While the trip is active, refresh every 30 s so "Driver Assigned → Ongoing → Completed" shows up by itself
  useEffect(() => {
    if (!live || !b) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      const fd = new FormData();
      fd.set("intent", "refresh");
      fd.set("code", b.code);
      fd.set("mobile", b.mobile);
      startTransition(() => action(fd));
    }, 30_000);
    return () => clearInterval(timer);
  }, [live, b, action]);

  return (
    <div className="space-y-6">
      <form action={action} className="card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-start" noValidate>
        <input type="hidden" name="intent" value="track" />
        <Field id="code" label="Booking ID" required error={errors.code}>
          <input {...aria("code", errors.code)} className="input uppercase" defaultValue={state.values?.code ?? initialCode} placeholder="MUM-20261101-AB12" autoComplete="off" />
        </Field>
        <Field id="mobile" label="Mobile number" required error={errors.mobile}>
          <input {...aria("mobile", errors.mobile)} className="input" type="tel" inputMode="numeric" placeholder="10-digit mobile" defaultValue={state.values?.mobile} />
        </Field>
        <div className="sm:pt-6">
          <SubmitButton pendingText="Searching…" className="btn-primary w-full">Find booking</SubmitButton>
        </div>
        <div className="sm:col-span-3"><FormMessage error={errors._form} /></div>
      </form>

      {b && (
        <section className="card overflow-hidden" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <p className="text-sm text-slate-500">Booking ID</p>
              <p className="font-mono text-xl font-bold">{b.code}</p>
            </div>
            <div className="text-right">
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[b.status as BookingStatus] ?? ""}`}>{statusLabel(b.status)}</span>
              {live && <p className="mt-1 text-xs text-slate-500">Updates automatically</p>}
            </div>
          </div>

          {b.status !== "CANCELLED" ? (
            <ol className="flex gap-1 overflow-x-auto px-5 pt-5 text-xs" aria-label="Booking progress">
              {PROGRESS.map((s, i) => {
                const reached = PROGRESS.indexOf(b.status as BookingStatus) >= i;
                return (
                  <li key={s} className="min-w-20 flex-1">
                    <div className={`h-1.5 rounded ${reached ? "bg-primary-700" : "bg-slate-200"}`} />
                    <p className={`mt-1 ${reached ? "font-semibold text-primary-900" : "text-slate-500"}`}>{statusLabel(s)}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mx-5 mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              This booking was cancelled{b.cancelReason ? `: ${b.cancelReason}` : "."}
            </p>
          )}

          <div className="grid gap-6 p-5 md:grid-cols-2">
            <dl className="space-y-2 text-sm">
              <Row k="Trip" v={tripTypeLabel(b.tripType)} />
              <Row k="From → To" v={`${b.pickupLocation} → ${b.dropLocation}`} />
              <Row k="Pickup" v={formatDateTime(b.pickupAt)} />
              {b.startedAt && <Row k="Ride started" v={formatDateTime(b.startedAt)} />}
              {b.completedAt && <Row k="Ride completed" v={formatDateTime(b.completedAt)} />}
              {b.returnAt && <Row k="Return" v={formatDate(b.returnAt)} />}
              <Row k="Pickup address" v={b.pickupAddress} />
              {b.dropAddress && <Row k="Drop address" v={b.dropAddress} />}
              <Row k="Car" v={b.car} />
              <Row k="Passengers" v={String(b.passengers)} />
              <Row k={b.finalFare ? "Final fare" : "Estimated fare"} v={formatINR(b.finalFare ?? b.estimatedFare)} />
            </dl>
            <div className="space-y-4">
              {b.driver ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm">
                  {b.status === "ONGOING" && (
                    <p className="mb-2 flex items-center gap-2 font-semibold text-purple-800">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-purple-600" aria-hidden="true" /> Your ride is in progress
                    </p>
                  )}
                  <p className="font-semibold text-indigo-900">Your driver</p>
                  <p className="mt-1">{b.driver.name}</p>
                  <a href={telHref(`+91${b.driver.phone}`)} className="font-semibold text-primary-700 underline">{b.driver.phone}</a>
                  {b.vehicle && <p className="mt-1">{b.vehicle.model} · <span className="font-mono">{b.vehicle.registrationNumber}</span></p>}
                </div>
              ) : (
                ["PENDING", "CONFIRMED"].includes(b.status) && (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Driver details will appear here once a driver is assigned.</p>
                )
              )}
              <div>
                <p className="mb-2 text-sm font-semibold">Status history</p>
                <ol className="space-y-1 border-l-2 border-slate-200 pl-4 text-sm">
                  {b.history.map((h, i) => (
                    <li key={i}>
                      <span className="font-medium">{statusLabel(h.toStatus)}</span>{" "}
                      <span className="text-slate-500">· {formatDateTime(h.at)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <details className="border-t border-slate-200 p-5">
            <summary className="cursor-pointer text-sm font-semibold text-primary-700">Fare breakdown (at booking)</summary>
            <div className="mt-3 max-w-md"><FareBreakdownView fare={b.fare} title="Estimated fare" /></div>
          </details>

          <div className="border-t border-slate-200 bg-slate-50 p-5">
            <FormMessage error={state.errors?._form} success={state.message} />
            {b.canCancel ? (
              confirming ? (
                <form action={action} className="mt-3 space-y-3">
                  <input type="hidden" name="intent" value="cancel" />
                  <input type="hidden" name="code" value={b.code} />
                  <input type="hidden" name="mobile" value={b.mobile} />
                  <Field id="reason" label="Reason for cancellation (optional)">
                    <textarea {...aria("reason")} className="input" rows={2} maxLength={300} />
                  </Field>
                  <div className="flex gap-3">
                    <SubmitButton className="btn-danger" pendingText="Cancelling…">Yes, cancel booking</SubmitButton>
                    <button type="button" className="btn-outline" onClick={() => setConfirming(false)}>Keep booking</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="btn-outline mt-2 text-red-700" onClick={() => setConfirming(true)}>Cancel this booking</button>
              )
            ) : (
              !["CANCELLED", "COMPLETED"].includes(b.status) && (
                <p className="text-sm text-slate-600">
                  Online cancellation is available up to {b.cancelCutoffHours} hours before pickup. Please call us to make changes.
                </p>
              )
            )}
          </div>
        </section>
      )}
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
