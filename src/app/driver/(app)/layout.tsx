import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { requireDriver } from "@/lib/auth/driver-session";
import { driverLogoutAction } from "@/actions/driver";

export const metadata: Metadata = { title: { default: "My Trips", template: "%s · Driver" }, robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#141b4d" };
export const dynamic = "force-dynamic";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const driver = await requireDriver();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 bg-primary-950 text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Link href="/driver" className="font-semibold">🚖 {driver.name}</Link>
          <form action={driverLogoutAction}>
            <button className="rounded-md px-3 py-1.5 text-sm text-slate-200 hover:bg-primary-900">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-5">{children}</main>
    </div>
  );
}
