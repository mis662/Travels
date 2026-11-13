import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { TrackBooking } from "@/components/booking/TrackBooking";

export const metadata: Metadata = {
  title: "Track / Manage Booking",
  description: "Check your cab booking status, driver details, or cancel your booking using your Booking ID and mobile number.",
  alternates: { canonical: "/track" },
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <>
      <PageHeader title="Track / Manage Booking" subtitle="Enter your Booking ID and the mobile number used while booking." />
      <div className="container-x max-w-4xl py-8">
        <TrackBooking initialCode={typeof code === "string" ? code.toUpperCase().slice(0, 20) : ""} />
      </div>
    </>
  );
}
