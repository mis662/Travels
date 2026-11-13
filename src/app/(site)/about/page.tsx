import type { Metadata } from "next";
import { getSettings } from "@/lib/services/settings";
import { PageHeader } from "@/components/site/PageHeader";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about our Mumbai tours & travels company – reliable airport, local and outstation cab services with verified drivers.",
  alternates: { canonical: "/about" },
};

// Edit the text below to tell your story.
export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title={`About ${s.businessName}`} subtitle={s.tagline} />
      <div className="container-x prose-legal max-w-3xl py-10">
        <p>
          {s.businessName} is a Mumbai-based tours &amp; travels company providing airport transfers, local hourly rentals, outstation trips,
          wedding cars and group travel. [Write a short paragraph about when you started, how many cars you operate and what makes you different.]
        </p>
        <h2>Our promise</h2>
        <ul>
          <li>Transparent fares with a clear breakdown — no hidden charges.</li>
          <li>Experienced, police-verified drivers who know Mumbai and the highways.</li>
          <li>Clean, well-maintained, commercially permitted and insured cars.</li>
          <li>No advance payment — pay after your trip.</li>
          <li>Support on call and WhatsApp, 24×7.</li>
        </ul>
        <h2>Our fleet</h2>
        <p>From budget hatchbacks and sedans to Innova Crysta, luxury cars, Tempo Travellers and mini buses — we have a vehicle for every trip and group size.</p>
        <h2>Visit us</h2>
        <p>{s.address}<br />Phone: {s.phonePrimary}{s.phoneSecondary && `, ${s.phoneSecondary}`}<br />Email: {s.email}</p>
      </div>
      <CtaBand />
    </>
  );
}
