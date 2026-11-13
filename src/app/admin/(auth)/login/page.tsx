import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/services/settings";
import { loginAction } from "@/actions/admin/auth";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "Admin Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  const s = await getSettings();
  return (
    <AuthCard fullScreen title={s.businessName} subtitle="Admin dashboard" tabs={{ signIn: "/admin/login", signUp: "/admin/signup", active: "in" }}>
      <ActionForm action={loginAction}>
        <AuthField label="Email" name="email" type="email" autoComplete="username" required />
        <AuthField label="Password" name="password" type="password" autoComplete="current-password" required />
        <Submit className="btn-primary w-full py-3">Sign in</Submit>
      </ActionForm>
    </AuthCard>
  );
}
