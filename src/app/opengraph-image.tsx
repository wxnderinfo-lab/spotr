import { ImageResponse } from "next/og";

export const alt = "Jobmarkt: opdrachten plaatsen en werk vinden";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#fbfaf7", padding: 80, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 40 40">
            <path d="M26 16.5V26a9 9 0 0 1-9 9h-2.5" fill="none" stroke="#16181b" strokeWidth="7" strokeLinecap="round" />
            <circle cx="26" cy="7" r="4.6" fill="#0e6b6b" />
          </svg>
          <span style={{ fontSize: 72, fontWeight: 800, color: "#16181b", letterSpacing: -2 }}>Jobmarkt</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 60, fontWeight: 800, color: "#16181b", lineHeight: 1.1 }}>Iets laten doen of werk vinden?</span>
          <span style={{ fontSize: 34, color: "#3b3f45", marginTop: 20 }}>Lokale klussen en online opdrachten. Gratis plaatsen, geen kosten per contact.</span>
        </div>
      </div>
    ),
    size,
  );
}
