import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/auth/company-session";
import { getSettings } from "@/lib/services/settings";
import { companyLogoutAction } from "@/actions/company";
import { PortalNav } from "@/components/portal/PortalNav";

export const metadata: Metadata = { title: { default: "Company", template: "%s · Company" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const nav = [
  { href: "/company", label: "Dashboard" },
  { href: "/company/book", label: "Book cars" },
  { href: "/company/orders", label: "Bookings" },
  { href: "/company/employees", label: "Employees" },
  { href: "/company/routes", label: "Routes" },
  { href: "/company/fleet", label: "Fleet" },
  { href: "/company/account", label: "Account" },
];

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const company = await requireCompany();
  const s = await getSettings();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-primary-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pt-3">
          <div>
            <Link href="/company" className="text-lg font-bold">{company.name}</Link>
            <p className="text-xs text-slate-300">Corporate account · {s.businessName}</p>
          </div>
          <form action={companyLogoutAction}>
            <button className="rounded-md px-3 py-1.5 text-sm text-slate-200 ring-1 ring-white/30 hover:bg-primary-900">Sign out</button>
          </form>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-2"><PortalNav items={nav} /></div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
