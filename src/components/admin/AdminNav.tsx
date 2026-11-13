"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const superItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/corporate", label: "Corporate bookings" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/team", label: "Team (sub-admins)" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/pricing", label: "Cars & Pricing" },
  { href: "/admin/routes", label: "Routes" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/settings", label: "Settings" },
];

// Sub-admins handle the corporate bookings given to them, and manage drivers/vehicles
const subItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/corporate", label: "My corporate bookings" },
  { href: "/admin/bookings", label: "Duties" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/account", label: "My account" },
];

export function AdminNav({ badges, isSuper }: { badges: Record<string, number>; isSuper: boolean }) {
  const path = usePathname();
  const items = isSuper ? superItems : subItems;
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-primary-800 font-semibold text-white" : "hover:bg-primary-900"}`}
          >
            {i.label}
            {badges[i.href] ? (
              <span className="rounded-full bg-accent-400 px-2 text-xs font-bold text-primary-950">{badges[i.href]}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
