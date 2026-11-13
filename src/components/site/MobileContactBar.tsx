import { telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";

/** Sticky Call / WhatsApp bar shown on small screens. */
export function MobileContactBar({ phone, whatsapp }: { phone: string; whatsapp: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:hidden">
      <a href={telHref(phone)} className="flex items-center justify-center gap-2 bg-accent-400 py-3.5 font-semibold text-primary-950">
        <PhoneIcon /> Call Now
      </a>
      <a
        href={waLink(whatsapp, "Hi, I want to book a cab.")}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-[#1da851] py-3.5 font-semibold text-white"
      >
        <WhatsAppIcon /> WhatsApp
      </a>
    </div>
  );
}
