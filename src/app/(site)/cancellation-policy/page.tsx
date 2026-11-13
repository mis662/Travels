import type { Metadata } from "next";
import { getSettings } from "@/lib/services/settings";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Cancellation Policy", alternates: { canonical: "/cancellation-policy" } };

// Edit the text in this file to match your cancellation policy.
export default async function CancellationPolicyPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Cancellation Policy" updated="[date]">
      <h2>Cancelling online</h2>
      <p>You can cancel your booking free of charge on the <a href="/track" className="underline">Track Booking</a> page using your Booking ID and mobile number, if the pickup is more than {s.cancellationCutoffHours} hours away.</p>
      <h2>Late cancellation</h2>
      <p>For cancellations within {s.cancellationCutoffHours} hours of pickup, please call {s.phonePrimary}. [Describe any late cancellation charge, e.g. a fixed amount or a percentage of the fare.]</p>
      <h2>No-show</h2>
      <p>[Describe what happens if the passenger does not show up at the pickup point.]</p>
      <h2>Cancellation by us</h2>
      <p>In rare cases (vehicle breakdown, extreme weather, etc.) we may need to cancel or reschedule. We will inform you as early as possible and help arrange an alternative.</p>
      <h2>Refunds</h2>
      <p>As no advance payment is collected online, no refund is usually required. If you have paid any advance to our office, it will be refunded as per the terms communicated at the time of payment.</p>
    </LegalPage>
  );
}
