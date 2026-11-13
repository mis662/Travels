import Link from "next/link";
import { telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import { getSettings } from "@/lib/services/settings";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";

export async function CtaBand({ title = "Ready to ride?", text = "Get an instant fare estimate and book in under a minute." }: { title?: string; text?: string }) {
  const s = await getSettings();
  return (
    <section className="container-x py-12">
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-primary-900 p-8 text-white md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-slate-200">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/#book" className="btn-accent">Book Now</Link>
          <a href={telHref(s.phonePrimary)} className="btn bg-white text-primary-900 hover:bg-slate-100">
            <PhoneIcon className="h-4 w-4" /> Call
          </a>
          <a href={waLink(s.whatsappPrimary, "Hi, I want to book a cab.")} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
            <WhatsAppIcon className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
