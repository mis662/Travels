import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} – Mumbai cabs`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default social share image for every page (generated at request time, no external assets).
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #141b4d 0%, #1e2eae 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 28, color: "#141b4d", background: "#facc15", padding: "8px 20px", borderRadius: 999, alignSelf: "flex-start", fontWeight: 700 }}>
          Airport · Local · Outstation
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, marginTop: 30, lineHeight: 1.1 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 40, marginTop: 20, color: "#dbe6fe" }}>Trusted cabs in Mumbai · Pay after your trip</div>
        <div style={{ fontSize: 34, marginTop: 40, color: "#facc15" }}>{siteConfig.phones[0]}</div>
      </div>
    ),
    size,
  );
}
