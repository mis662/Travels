import type { Metadata } from "next";
import { getSettings } from "@/lib/services/settings";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

// Edit the text in this file to match your business terms.
export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Terms & Conditions" updated="[date]">
      <h2>1. Booking</h2>
      <p>A booking made on this website is a booking request. It is confirmed once {s.businessName} confirms it by call, WhatsApp or email. Fares shown online are estimates; the final fare is confirmed on call/WhatsApp.</p>
      <h2>2. Payment</h2>
      <p>No online payment is collected. Pay directly to the driver or our office after the trip by cash or UPI. Toll, parking, state entry tax and any other charges shown as “extra as actual” are payable by the customer.</p>
      <h2>3. Fares</h2>
      <ul>
        <li>Local packages include the stated hours and kilometres; extra hours and kilometres are charged at the rates shown.</li>
        <li>Outstation round trips are charged on a minimum kilometres per day basis plus driver allowance.</li>
        <li>A night charge applies to pickups within the configured night hours.</li>
        <li>GST is charged as applicable.</li>
      </ul>
      <h2>4. Waiting and delays</h2>
      <p>[Describe free waiting time and waiting charges.]</p>
      <h2>5. Passenger conduct</h2>
      <p>Passengers must not exceed the seating capacity. Smoking, alcohol consumption and illegal items are not permitted in the vehicle. Damage to the vehicle caused by passengers will be charged.</p>
      <h2>6. Luggage</h2>
      <p>Luggage is carried at the passenger’s own risk. Please check the luggage capacity of the selected car.</p>
      <h2>7. Liability</h2>
      <p>[Your liability clause, e.g. for delays caused by traffic, weather, breakdowns or events beyond our control.]</p>
      <h2>8. Contact</h2>
      <p>{s.businessName}, {s.address}. Phone {s.phonePrimary}. Email {s.email}.</p>
    </LegalPage>
  );
}
