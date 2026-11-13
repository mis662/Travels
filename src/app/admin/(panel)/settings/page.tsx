import { requireSuperAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/services/settings";
import { saveSettingsAction } from "@/actions/admin/settings";
import { changePasswordAction } from "@/actions/admin/auth";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireSuperAdmin();
  const s = await getSettings();
  const text = (name: keyof typeof s, label: string, opts: { type?: string; wide?: boolean } = {}) => (
    <div className={opts.wide ? "sm:col-span-2" : ""}>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type={opts.type ?? "text"} defaultValue={String(s[name] ?? "")} className="input" />
    </div>
  );
  return (
    <>
      <PageTitle title="Settings" />
      <Panel title="Business details">
        <ActionForm action={saveSettingsAction} className="grid gap-3 sm:grid-cols-2">
          {text("businessName", "Business name")}
          {text("tagline", "Tagline")}
          {text("phonePrimary", "Phone (primary)")}
          {text("phoneSecondary", "Phone (secondary)")}
          {text("whatsappPrimary", "WhatsApp number (primary, with country code)")}
          {text("whatsappSecondary", "WhatsApp number (secondary)")}
          {text("email", "Email", { type: "email" })}
          {text("address", "Office address", { wide: false })}
          {text("advanceBookingHours", "Minimum advance booking (hours)", { type: "number" })}
          {text("cancellationCutoffHours", "Online cancellation allowed until (hours before pickup)", { type: "number" })}
          <div className="sm:col-span-2"><Submit>Save settings</Submit></div>
        </ActionForm>
        <p className="mt-3 text-xs text-slate-500">Pricing settings (night charge, GST, minimum km) are under Cars &amp; Pricing. Brand colours are in <code>src/app/theme.css</code>.</p>
      </Panel>

      <Panel title="Change password" className="mt-6 max-w-lg">
        <ActionForm action={changePasswordAction} className="space-y-3" resetOnSuccess>
          <div><label htmlFor="current" className="label">Current password</label><input id="current" name="current" type="password" autoComplete="current-password" className="input" /></div>
          <div><label htmlFor="next" className="label">New password (min 8 characters)</label><input id="next" name="next" type="password" autoComplete="new-password" className="input" /></div>
          <div><label htmlFor="confirm" className="label">Confirm new password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" /></div>
          <Submit>Change password</Submit>
        </ActionForm>
      </Panel>
    </>
  );
}
