"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Horizontal nav used by the company and employee portals. The first item is the portal home. */
export function PortalNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  const home = items[0]?.href;
  return (
    <nav aria-label="Portal" className="flex gap-1 overflow-x-auto">
      {items.map((i) => {
        const active = i.href === home ? path === home : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-white font-semibold text-primary-900" : "text-slate-200 hover:bg-primary-900 hover:text-white"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
