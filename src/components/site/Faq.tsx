import { hourLabel } from "@/lib/fare/engine";
import { JsonLd } from "./JsonLd";

export interface FaqItem {
  q: string;
  a: string;
}

export function Faq({ items, title = "Frequently asked questions" }: { items: FaqItem[]; title?: string }) {
  return (
    <section className="container-x py-12" aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {items.map((f) => (
          <details key={f.q} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-xl text-primary-700 transition group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="mt-2 text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
    </section>
  );
}

export function generalFaqs(s: {
  advanceBookingHours: number;
  cancellationCutoffHours: number;
  nightStartHour: number;
  nightEndHour: number;
}): FaqItem[] {
  return [
    { q: "Do I need to pay online to book?", a: "No. Submit your booking request and pay directly to the driver or at our office after the trip. The final fare is confirmed on call or WhatsApp." },
    { q: "Are tolls and parking included in the fare?", a: "No. Toll, parking and state entry tax are extra as actual and paid during or after the trip. Everything else shown in the fare breakdown is included." },
    { q: "How early should I book?", a: `You can book online up to ${s.advanceBookingHours} hours before pickup. For urgent bookings please call or WhatsApp us.` },
    { q: "Can I cancel my booking?", a: `Yes. Use Track Booking to cancel online if your pickup is more than ${s.cancellationCutoffHours} hours away. For later cancellations, please call us.` },
    { q: "Is there a night charge?", a: `A night charge applies for pickups between ${hourLabel(s.nightStartHour)} and ${hourLabel(s.nightEndHour)}. It is shown separately in the fare breakdown.` },
    { q: "Are your drivers verified?", a: "All drivers are experienced, licensed and police-verified, and our cars are commercially permitted and insured." },
  ];
}
