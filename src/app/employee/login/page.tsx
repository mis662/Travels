import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/employee-session";
import { getSettings } from "@/lib/services/settings";
import { employeeLoginAction } from "@/actions/employee";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "Employee Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EmployeeLoginPage() {
  if (await getCurrentEmployee()) redirect("/employee");
  const s = await getSettings();
  return (
    <AuthCard fullScreen title={s.businessName} subtitle="Employee rides" footer={<>Your login is created by your company&apos;s admin. Forgot your password? Ask them to reset it.</>}>
      <ActionForm action={employeeLoginAction}>
        <AuthField label="Mobile number" name="mobile" type="tel" inputMode="numeric" autoComplete="tel-national" required />
        <AuthField label="Password" name="password" type="password" autoComplete="current-password" required />
        <Submit className="btn-primary w-full py-3">Sign in</Submit>
      </ActionForm>
    </AuthCard>
  );
}
