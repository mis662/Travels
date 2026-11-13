import type { InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

/**
 * Shared look for every sign-in / sign-up screen.
 * `fullScreen` = admin & driver apps (dark page); otherwise it sits inside the public site layout.
 */
export function AuthCard({
  title,
  subtitle,
  tabs,
  children,
  footer,
  fullScreen = false,
}: {
  title: string;
  subtitle?: string;
  tabs?: { signIn: string; signUp: string; active: "in" | "up" };
  children: ReactNode;
  footer?: ReactNode;
  fullScreen?: boolean;
}) {
  const card = (
    <div className="card w-full max-w-md p-6 sm:p-8">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      {tabs && (
        <nav aria-label="Sign in or sign up" className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <Link href={tabs.signIn} aria-current={tabs.active === "in" ? "page" : undefined} className={`rounded-lg px-3 py-2 text-center ${tabs.active === "in" ? "bg-white text-primary-900 shadow" : "text-slate-600 hover:text-slate-900"}`}>
            Sign in
          </Link>
          <Link href={tabs.signUp} aria-current={tabs.active === "up" ? "page" : undefined} className={`rounded-lg px-3 py-2 text-center ${tabs.active === "up" ? "bg-white text-primary-900 shadow" : "text-slate-600 hover:text-slate-900"}`}>
            Sign up
          </Link>
        </nav>
      )}
      <div className="mt-5">{children}</div>
      {footer && <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">{footer}</div>}
    </div>
  );
  if (fullScreen) return <div className="grid min-h-screen place-items-center bg-primary-950 px-4 py-10">{card}</div>;
  return <div className="grid place-items-center px-4 py-10 sm:py-16">{card}</div>;
}

export function AuthField({ label, name, hint, ...input }: { label: string; name: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} className="input" {...input} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
