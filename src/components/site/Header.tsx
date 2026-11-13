import Link from "next/link";
import { mainNav } from "@/config/site";
import { telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import type { PublicSettings } from "@/lib/services/settings";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";
import { Logo } from "./Logo";

export function Header({ settings, customerName }: { settings: PublicSettings; customerName?: string }) {
  const account = customerName
    ? { href: "/account", label: "My bookings" }
    : { href: "/account/login", label: "Sign in" };
  return (
    <header className="sticky top-0 z-40 border-b border-primary-900 bg-primary-950 text-white">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo name={settings.businessName} />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {mainNav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-primary-900 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href={account.href} title={customerName} className="rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap text-white ring-1 ring-white/30 hover:bg-primary-900">
            {account.label}
          </Link>
          <a href={telHref(settings.phonePrimary)} className="btn-accent whitespace-nowrap" aria-label={`Call ${settings.phonePrimary}`}>
            <PhoneIcon className="h-4 w-4" /> <span className="hidden xl:inline">{settings.phonePrimary}</span>
          </a>
          <a href={waLink(settings.whatsappPrimary)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp" aria-label="Chat on WhatsApp">
            <WhatsAppIcon className="h-4 w-4" />
          </a>
        </div>
        <details className="group relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-md p-2 hover:bg-primary-900 [&::-webkit-details-marker]:hidden" aria-label="Open menu">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </summary>
          <nav aria-label="Mobile" className="absolute right-0 mt-2 w-56 rounded-lg bg-white py-2 text-slate-800 shadow-xl">
            <Link href={account.href} className="block border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-primary-800 hover:bg-slate-100">{account.label}</Link>
            {mainNav.map((n) => (
              <Link key={n.href} href={n.href} className="block px-4 py-2.5 text-sm hover:bg-slate-100">
                {n.label}
              </Link>
            ))}
            <Link href="/services/wedding-cars" className="block px-4 py-2.5 text-sm hover:bg-slate-100">Wedding Cars</Link>
            <Link href="/services/tempo-traveller" className="block px-4 py-2.5 text-sm hover:bg-slate-100">Tempo Traveller</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
