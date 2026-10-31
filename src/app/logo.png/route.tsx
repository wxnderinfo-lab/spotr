import { ImageResponse } from "next/og";

// Logo als PNG voor structured data (Organization.logo) en e-mails.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#16181b", borderRadius: 96 }}>
        <svg width="360" height="360" viewBox="0 0 40 40">
          <path d="M25 16.5V25a8 8 0 0 1-8 8h-2" fill="none" stroke="#fbfaf7" strokeWidth="6" strokeLinecap="round" />
          <circle cx="25" cy="8.5" r="4.2" fill="#5cc2bb" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
