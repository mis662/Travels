"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createBookingAction } from "@/actions/booking";
import { customerDetailsSchema, type TripSearch } from "@/lib/validation/booking";
import { fieldErrors } from "@/lib/validation/common";
import { checkPassengers, checkTripTiming } from "@/lib/booking/rules";
import { aria, Field, FormMessage } from "@/components/ui/Field";

interface Props {
  trip: TripSearch;
  car: string;
  seats: number;
  advanceHours: number;
  pickupLabel: string;
  dropLabel: string;
  dropRequired: boolean;
  /** Prefilled from the signed-in customer's account (still editable, e.g. booking for someone else) */
  defaults?: { customerName: string; customerMobile: string; customerEmail: string };
}

function uuid(): string {
  // randomUUID is missing in non-secure contexts (e.g. testing on a LAN IP over http)
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function BookingForm({ trip, car, seats, advanceHours, pickupLabel, dropLabel, dropRequired, defaults }: Props) {
  const [idempotencyKey] = useState(uuid);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || submitted) return;
    const fd = new FormData(e.currentTarget);
    const details = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));

    const parsed = customerDetailsSchema.safeParse(details);
    const errs: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);
    const pax = Number(details.passengers);
    if (!errs.passengers && Number.isInteger(pax)) {
      const paxError = checkPassengers(pax, seats);
      if (paxError) errs.passengers = paxError;
    }
    if (dropRequired && !details.dropAddress?.trim()) errs.dropAddress = "Enter the drop address";
    const timing = checkTripTiming(trip, advanceHours);
    if (!timing.ok) errs._form = `${Object.values(timing.errors)[0]}. Please modify your trip.`;

    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs).find((k) => k !== "_form") ?? "")?.focus();
      return;
    }

    setSubmitted(true);
    startTransition(async () => {
      const res = await createBookingAction({ trip, car, details, idempotencyKey });
      if (res?.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.errors)) {
          if (k.startsWith("details.")) mapped[k.slice(8)] = v;
          else mapped._form = mapped._form ?? v;
        }
        setErrors(mapped);
        setSubmitted(false);
      }
    });
  }

  const busy = pending || submitted;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2" aria-describedby="form-error">
      <div id="form-error" className="sm:col-span-2"><FormMessage error={errors._form} /></div>

      <Field id="customerName" label="Full name" required error={errors.customerName}>
        <input {...aria("customerName", errors.customerName)} className="input" autoComplete="name" maxLength={80} defaultValue={defaults?.customerName} />
      </Field>
      <Field id="customerMobile" label="Mobile number" required error={errors.customerMobile} hint="10-digit Indian mobile, used for confirmation">
        <input {...aria("customerMobile", errors.customerMobile)} className="input" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98XXXXXXXX" maxLength={14} defaultValue={defaults?.customerMobile} />
      </Field>
      <Field id="customerEmail" label="Email (optional)" error={errors.customerEmail} hint="We'll email your booking details">
        <input {...aria("customerEmail", errors.customerEmail)} className="input" type="email" autoComplete="email" defaultValue={defaults?.customerEmail} />
      </Field>
      <Field id="passengers" label="Passengers" required error={errors.passengers} hint={`Maximum ${seats} for this car`}>
        <input {...aria("passengers", errors.passengers)} className="input" type="number" min={1} max={seats} defaultValue={1} />
      </Field>
      <Field id="pickupAddress" label={`Pickup address${pickupLabel ? ` (${pickupLabel})` : ""}`} required error={errors.pickupAddress} className="sm:col-span-2">
        <textarea {...aria("pickupAddress", errors.pickupAddress)} className="input" rows={2} maxLength={300} placeholder="Building, street, landmark, area" />
      </Field>
      <Field id="dropAddress" label={`Drop address${dropLabel ? ` (${dropLabel})` : ""}`} required={dropRequired} error={errors.dropAddress} className="sm:col-span-2">
        <textarea {...aria("dropAddress", errors.dropAddress)} className="input" rows={2} maxLength={300} placeholder={dropRequired ? "Building, street, landmark, area" : "Optional"} />
      </Field>
      <Field id="specialRequests" label="Special requests (optional)" error={errors.specialRequests} hint="Flight number, child seat, luggage carrier, stops on the way…" className="sm:col-span-2">
        <textarea {...aria("specialRequests", errors.specialRequests)} className="input" rows={2} maxLength={500} />
      </Field>

      <div className="sm:col-span-2">
        <button type="submit" className="btn-accent w-full py-3 text-base" disabled={busy} aria-busy={busy}>
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              Confirming…
            </>
          ) : (
            "Confirm Booking"
          )}
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">
          By confirming you agree to our <a href="/terms" className="underline">Terms</a> and <a href="/cancellation-policy" className="underline">Cancellation Policy</a>. No payment is taken now.
        </p>
      </div>
    </form>
  );
}
