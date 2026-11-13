import Link from "next/link";
import { serviceLinks } from "@/config/site";
import { telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import type { PublicSettings } from "@/lib/services/settings";

export function Footer({ settings, routes }: { settings: PublicSettings; routes: { slug: string; toCity: string }[] }) {
  const phones = [settings.phonePrimary, settings.phoneSecondary].filter(Boolean);
  return (
    <footer className="mt-16 bg-primary-950 pb-24 text-slate-300 md:pb-0">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-white">{settings.businessName}</p>
          <p className="mt-2 text-sm">{settings.tagline}</p>
          <address className="mt-4 text-sm not-italic">
            {settings.address}
            <br />
            {phones.map((p) => (
              <a key={p} href={telHref(p)} className="block hover:text-white">
                {p}
              </a>
            ))}
            <a href={`mailto:${settings.email}`} className="block hover:text-white">
              {settings.email}
            </a>
          </address>
        </div>
        <div>
          <p className="font-semibold text-white">Services</p>
          <ul className="mt-3 space-y-2 text-sm">
            {serviceLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
            <li><Link href="/fleet" className="hover:text-white">Our Fleet</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Popular Routes</p>
          <ul className="mt-3 space-y-2 text-sm">
            {routes.slice(0, 8).map((r) => (
              <li key={r.slug}>
                <Link href={`/routes/${r.slug}`} className="hover:text-white">Mumbai to {r.toCity}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Company</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
            <li><Link href="/track" className="hover:text-white">Track / Manage Booking</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link href="/cancellation-policy" className="hover:text-white">Cancellation Policy</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
          </ul>
          <a href={waLink(settings.whatsappPrimary)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mt-4">
            WhatsApp us
          </a>
        </div>
      </div>
      <div className="border-t border-primary-900 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
      </div>
    </footer>
  );
}
