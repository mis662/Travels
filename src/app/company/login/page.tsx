import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/auth/company-session";
import { getSettings } from "@/lib/services/settings";
import { companyLoginAction } from "@/actions/company";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "Company Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyLoginPage() {
  if (await getCurrentCompany()) redirect("/company");
  const s = await getSettings();
  return (
    <AuthCard
      fullScreen
      title={s.businessName}
      subtitle="Corporate account"
      footer={<>Your user ID and password are provided by {s.businessName}. Need help? Call {s.phonePrimary}.</>}
    >
      <ActionForm action={companyLoginAction}>
        <AuthField label="Company user ID" name="loginId" autoComplete="username" required />
        <AuthField label="Password" name="password" type="password" autoComplete="current-password" required />
        <Submit className="btn-primary w-full py-3">Sign in</Submit>
      </ActionForm>
    </AuthCard>
  );
}
