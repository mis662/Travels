import type { Metadata } from "next";
import Link from "next/link";
import { bookingScope, orderScope, requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import { logoutAction } from "@/actions/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [s, pending, openEnquiries, pendingDrivers, newOrders] = await Promise.all([
    getSettings(),
    prisma.booking.count({ where: { status: "PENDING", ...bookingScope(admin) } }),
    admin.isSuper ? prisma.contactEnquiry.count({ where: { resolved: false } }) : 0,
    prisma.driver.count({ where: { approved: false } }),
    prisma.corporateOrder.count({ where: { status: "NEW", ...orderScope(admin) } }),
  ]);
  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="bg-primary-950 text-slate-200 lg:min-h-screen">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/admin" className="font-bold text-white">{s.businessName}</Link>
          <Link href="/" className="text-xs text-slate-400 hover:text-white" target="_blank">View site ↗</Link>
        </div>
        <AdminNav
          isSuper={admin.isSuper}
          badges={{ "/admin/bookings": pending, "/admin/enquiries": openEnquiries, "/admin/drivers": pendingDrivers, "/admin/corporate": newOrders }}
        />
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <p className="text-sm text-slate-600">
            Signed in as <strong>{admin.name}</strong> <span className="hidden sm:inline">({admin.email})</span>{" "}
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${admin.isSuper ? "bg-primary-100 text-primary-900" : "bg-slate-200 text-slate-700"}`}>
              {admin.isSuper ? "Super admin" : "Sub-admin"}
            </span>
          </p>
          <form action={logoutAction}>
            <button className="btn-outline py-1.5 text-xs">Log out</button>
          </form>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
