import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/auth/company-session";
import { companyChangePasswordAction } from "@/actions/company";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "Change password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompanyChangePasswordPage() {
  const company = await requireCompany({ allowPasswordChange: true });
  return (
    <AuthCard
      fullScreen
      title={company.mustChangePassword ? "Set your own password" : "Change password"}
      subtitle={company.mustChangePassword ? `Welcome, ${company.name}! For security, replace the password you were given.` : company.name}
      footer={company.mustChangePassword ? undefined : <Link href="/company" className="text-primary-700 underline">← Back to dashboard</Link>}
    >
      <ActionForm action={companyChangePasswordAction} resetOnSuccess>
        <AuthField label="Current password" name="current" type="password" autoComplete="current-password" required />
        <AuthField label="New password" name="next" type="password" autoComplete="new-password" hint="At least 8 characters" required />
        <AuthField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
        <Submit className="btn-primary w-full py-3">Save password</Submit>
      </ActionForm>
    </AuthCard>
  );
}
