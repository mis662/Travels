import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/services/settings";
import { adminSignupAction } from "@/actions/admin/auth";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "Admin Sign up", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSignupPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  const s = await getSettings();
  const enabled = Boolean(process.env.ADMIN_SIGNUP_CODE?.trim());
  return (
    <AuthCard fullScreen title={s.businessName} subtitle="Create an admin account" tabs={{ signIn: "/admin/login", signUp: "/admin/signup", active: "up" }}>
      {enabled ? (
        <ActionForm action={adminSignupAction}>
          <AuthField label="Full name" name="name" autoComplete="name" required />
          <AuthField label="Email" name="email" type="email" autoComplete="username" required />
          <AuthField label="Password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters" required />
          <AuthField label="Confirm password" name="confirm" type="password" autoComplete="new-password" required />
          <AuthField label="Invite code" name="inviteCode" type="password" autoComplete="off" hint="Ask the business owner for the admin invite code" required />
          <Submit className="btn-primary w-full py-3">Create account</Submit>
        </ActionForm>
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Admin sign-up is turned off. The owner can enable it by setting <code>ADMIN_SIGNUP_CODE</code> in the <code>.env</code> file and sharing that code with new admins.
        </p>
      )}
    </AuthCard>
  );
}
