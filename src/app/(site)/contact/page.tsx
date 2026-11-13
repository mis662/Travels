import type { Metadata } from "next";
import { getSettings } from "@/lib/services/settings";
import { telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactForm } from "@/components/site/ContactForm";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Call, WhatsApp or email us to book a cab in Mumbai or get a quote for weddings, events and group travel.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSettings();
  const phones = [s.phonePrimary, s.phoneSecondary].filter(Boolean);
  const whatsapps = [s.whatsappPrimary, s.whatsappSecondary].filter(Boolean);
  return (
    <>
      <PageHeader title="Contact us" subtitle="We usually respond within 15 minutes, 24×7." />
      <div className="container-x grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <section className="card p-5" aria-labelledby="form-title">
          <h2 id="form-title" className="mb-4 text-lg font-semibold">Send us a message</h2>
          <ContactForm />
        </section>
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold">Call us</h2>
            {phones.map((p) => (
              <a key={p} href={telHref(p)} className="mt-2 flex items-center gap-2 text-primary-800 hover:underline"><PhoneIcon className="h-4 w-4" /> {p}</a>
            ))}
          </div>
          <div className="card p-5">
            <h2 className="font-semibold">WhatsApp</h2>
            {whatsapps.map((w) => (
              <a key={w} href={waLink(w, "Hi, I want to book a cab.")} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-green-700 hover:underline"><WhatsAppIcon className="h-4 w-4" /> {w}</a>
            ))}
          </div>
          <div className="card p-5">
            <h2 className="font-semibold">Email &amp; office</h2>
            <a href={`mailto:${s.email}`} className="mt-2 block text-primary-800 hover:underline">{s.email}</a>
            <address className="mt-2 text-sm text-slate-600 not-italic">{s.address}</address>
          </div>
        </aside>
      </div>
    </>
  );
}
