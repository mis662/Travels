import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer, safeNext } from "@/lib/auth/customer-session";
import { customerLoginAction } from "@/actions/account";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function CustomerLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentCustomer()) redirect(next);
  const booking = next.startsWith("/book");
  const q = next === "/account" ? "" : `?next=${encodeURIComponent(next)}`;
  return (
    <AuthCard
      title={booking ? "Sign in to continue your booking" : "Sign in"}
      subtitle={booking ? "Your trip and fare are saved — you'll come right back to them." : "See and manage all your bookings."}
      tabs={{ signIn: `/account/login${q}`, signUp: `/account/signup${q}`, active: "in" }}
    >
      <ActionForm action={customerLoginAction}>
        <input type="hidden" name="next" value={next} />
        <AuthField label="Mobile number or email" name="login" autoComplete="username" required />
        <AuthField label="Password" name="password" type="password" autoComplete="current-password" required />
        <Submit className="btn-accent w-full py-3 text-base">Sign in</Submit>
      </ActionForm>
    </AuthCard>
  );
}
