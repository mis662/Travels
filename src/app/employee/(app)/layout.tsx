import type { Metadata } from "next";
import { requireEmployee } from "@/lib/auth/employee-session";
import { employeeLogoutAction } from "@/actions/employee";
import { PortalNav } from "@/components/portal/PortalNav";

export const metadata: Metadata = { title: { default: "My rides", template: "%s · Employee" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const me = await requireEmployee();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-primary-950 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 pt-3">
          <div>
            <p className="font-bold">{me.name}</p>
            <p className="text-xs text-slate-300">{me.company.name}</p>
          </div>
          <form action={employeeLogoutAction}>
            <button className="rounded-md px-3 py-1.5 text-sm text-slate-200 ring-1 ring-white/30 hover:bg-primary-900">Sign out</button>
          </form>
        </div>
        <div className="mx-auto max-w-2xl px-4 py-2">
          <PortalNav items={[{ href: "/employee", label: "My rides" }, { href: "/employee/account", label: "Account" }]} />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>
    </div>
  );
}
