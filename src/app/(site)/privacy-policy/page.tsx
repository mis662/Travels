import type { Metadata } from "next";
import { getSettings } from "@/lib/services/settings";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy-policy" } };

// Edit the text in this file to match your privacy practices.
export default async function PrivacyPolicyPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Privacy Policy" updated="[date]">
      <h2>Information we collect</h2>
      <p>When you book or contact us we collect your name, mobile number, email (optional), pickup and drop addresses, travel dates and any special requests.</p>
      <h2>How we use it</h2>
      <ul>
        <li>To confirm and fulfil your booking and share driver details.</li>
        <li>To contact you by call, SMS, WhatsApp or email about your trip.</li>
        <li>To keep records as required by law.</li>
      </ul>
      <h2>Sharing</h2>
      <p>We share your name, mobile number and pickup details only with the driver assigned to your trip. We do not sell your personal data.</p>
      <h2>Cookies</h2>
      <p>We use essential cookies only — for example to show your booking confirmation and to keep admins signed in.</p>
      <h2>Data retention</h2>
      <p>[How long you keep booking records.]</p>
      <h2>Your rights</h2>
      <p>To access, correct or delete your information, email {s.email} or call {s.phonePrimary}.</p>
    </LegalPage>
  );
}
