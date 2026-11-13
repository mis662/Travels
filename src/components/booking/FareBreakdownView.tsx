import type { FareBreakdown } from "@/lib/fare/engine";
import { formatINR } from "@/lib/format";
import { siteConfig } from "@/config/site";

export function FareBreakdownView({ fare, title = "Fare breakdown", showNote = true }: { fare: FareBreakdown; title?: string; showNote?: boolean }) {
  return (
    <section aria-label={title} className="text-sm">
      <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
      <dl className="divide-y divide-slate-100">
        {fare.lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-4 py-2">
            <dt>
              {l.label}
              {l.detail && <span className="block text-xs text-slate-500">{l.detail}</span>}
            </dt>
            <dd className="whitespace-nowrap font-medium">{formatINR(l.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between py-2">
          <dt>Subtotal</dt>
          <dd className="font-medium">{formatINR(fare.subtotal)}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt>GST ({fare.gstPercent}%)</dt>
          <dd className="font-medium">{formatINR(fare.gstAmount)}</dd>
        </div>
        <div className="flex justify-between py-3 text-base">
          <dt className="font-bold text-slate-900">Estimated total</dt>
          <dd className="font-bold text-primary-800">{formatINR(fare.total)}</dd>
        </div>
      </dl>
      {fare.inclusions.length > 0 && (
        <div className="mt-2">
          <p className="font-medium text-slate-800">Included</p>
          <ul className="mt-1 list-inside list-disc text-slate-600">
            {fare.inclusions.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-3">
        <p className="font-medium text-slate-800">Extra (paid after trip)</p>
        <ul className="mt-1 list-inside list-disc text-slate-600">
          {fare.extras.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </div>
      {showNote && <PaymentNote />}
    </section>
  );
}

export function PaymentNote() {
  return (
    <p className="mt-4 rounded-lg border border-accent-300 bg-accent-50 px-3 py-2 text-sm text-slate-800">
      <strong>No online payment.</strong> {siteConfig.paymentNote}
    </p>
  );
}
