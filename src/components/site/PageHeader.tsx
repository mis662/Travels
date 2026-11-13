import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="bg-gradient-to-br from-primary-950 to-primary-800 text-white">
      <div className="container-x py-10 sm:py-14">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-slate-200">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
