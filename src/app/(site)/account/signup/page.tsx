import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer, safeNext } from "@/lib/auth/customer-session";
import { customerSignupAction } from "@/actions/account";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function CustomerSignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentCustomer()) redirect(next);
  const booking = next.startsWith("/book");
  const q = next === "/account" ? "" : `?next=${encodeURIComponent(next)}`;
  return (
    <AuthCard
      title={booking ? "Create an account to book" : "Create your account"}
      subtitle="Takes 30 seconds. Track all your trips in one place."
      tabs={{ signIn: `/account/login${q}`, signUp: `/account/signup${q}`, active: "up" }}
    >
      <ActionForm action={customerSignupAction}>
        <input type="hidden" name="next" value={next} />
        <AuthField label="Full name" name="name" autoComplete="name" required />
        <AuthField label="Mobile number" name="mobile" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98XXXXXXXX" required />
        <AuthField label="Email (optional)" name="email" type="email" autoComplete="email" hint="For booking confirmations by email" />
        <AuthField label="Password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters" required />
        <AuthField label="Confirm password" name="confirm" type="password" autoComplete="new-password" required />
        <Submit className="btn-accent w-full py-3 text-base">Create account</Submit>
        <p className="text-center text-xs text-slate-500">
          By signing up you agree to our <a href="/terms" className="underline">Terms</a> and <a href="/privacy-policy" className="underline">Privacy Policy</a>.
        </p>
      </ActionForm>
    </AuthCard>
  );
}
