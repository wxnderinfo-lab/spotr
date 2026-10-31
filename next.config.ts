import type { NextConfig } from "next";

// Oude Spotr-routes en Engelse paden blijven werken via permanente redirects.
const legacyRedirects = [
  ["/jobs", "/opdrachten"],
  ["/jobs/post", "/opdracht-plaatsen"],
  ["/freelancers", "/professionals"],
  ["/pricing", "/prijzen"],
  ["/terms", "/voorwaarden"],
  ["/auth/login", "/inloggen"],
  ["/auth/register", "/aanmelden"],
  ["/auth/forgot", "/wachtwoord-vergeten"],
  ["/dashboard", "/account"],
  ["/messages", "/berichten"],
  ["/settings", "/account/instellingen"],
  ["/settings/billing", "/account/abonnement"],
  ["/onboarding", "/welkom"],
  ["/admin", "/beheer"],
  ["/categories", "/categorieen"],
  ["/about", "/over-jobmarkt"],
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  trailingSlash: false,
  async redirects() {
    return [
      ...legacyRedirects.map(([source, destination]) => ({ source, destination, permanent: true })),
      { source: "/profile/:username", destination: "/professionals/:username", permanent: true },
      { source: "/jobs/:id", destination: "/opdrachten", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // privé-routes nooit indexeren (naast de meta-tag op de pagina zelf)
      ...["/account/:path*", "/berichten/:path*", "/beheer/:path*", "/welkom", "/toestemming", "/auth/:path*", "/wachtwoord-instellen"].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
};

export default nextConfig;
