import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDriver } from "@/lib/auth/driver-session";
import { getSettings } from "@/lib/services/settings";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";
import { driverLoginAction } from "@/actions/driver";

export const metadata: Metadata = { title: "Driver Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DriverLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentDriver()) redirect("/driver");
  const [{ next }, s] = await Promise.all([searchParams, getSettings()]);
  return (
    <AuthCard
      fullScreen
      title={s.businessName}
      subtitle="Driver app"
      tabs={{ signIn: "/driver/login", signUp: "/driver/signup", active: "in" }}
      footer={<>Forgot your PIN? Call the office on {s.phonePrimary}.</>}
    >
      <ActionForm action={driverLoginAction}>
        <input type="hidden" name="next" value={next ?? ""} />
        <AuthField label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" className="input text-lg" />
        <AuthField label="PIN" name="pin" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} className="input text-lg tracking-widest" />
        <Submit className="btn-primary w-full py-3 text-base">Sign in</Submit>
      </ActionForm>
    </AuthCard>
  );
}
