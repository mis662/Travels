import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDriver } from "@/lib/auth/driver-session";
import { getSettings } from "@/lib/services/settings";
import { istToday } from "@/lib/time";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";
import { driverSignupAction } from "@/actions/driver";

export const metadata: Metadata = { title: "Driver Sign up", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DriverSignupPage() {
  if (await getCurrentDriver()) redirect("/driver");
  const s = await getSettings();
  return (
    <AuthCard
      fullScreen
      title={s.businessName}
      subtitle="Register as a driver"
      tabs={{ signIn: "/driver/login", signUp: "/driver/signup", active: "up" }}
      footer={<>After you register, the office verifies your licence and approves your account. Questions? Call {s.phonePrimary}.</>}
    >
      <ActionForm action={driverSignupAction} resetOnSuccess>
        <AuthField label="Full name (as on licence)" name="name" autoComplete="name" required />
        <AuthField label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required />
        <AuthField label="Driving licence number" name="licenceNumber" autoComplete="off" required />
        <AuthField label="Licence valid till" name="licenceExpiry" type="date" min={istToday()} required />
        <AuthField label="Choose a PIN (4–6 digits)" name="pin" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" required />
        <AuthField label="Confirm PIN" name="confirm" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" required />
        <Submit className="btn-primary w-full py-3 text-base">Register</Submit>
      </ActionForm>
    </AuthCard>
  );
}
