// Centrale site-instellingen. Het definitieve domein en de juridische
// exploitant zijn nog niet vastgesteld: vul ze in via env vóór livegang
// (zie docs/LIVEGANG.md).
export const site = {
  name: "Jobmarkt",
  tagline: "Opdrachten en vakmensen, lokaal en online",
  description:
    "Plaats gratis een opdracht of vind werk: van schilderen en verhuizen tot video-editing en websites. Duidelijke prijzen, geen kosten per contact.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, ""),
  locale: "nl_NL",
  country: "NL",
  currency: "EUR",
  maker: { name: "CHAS", url: "https://chas.nu" },
  // Juridische exploitant: bewust leeg tot de eigenaar dit bevestigt.
  operator: {
    legalName: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "",
    kvk: process.env.NEXT_PUBLIC_OPERATOR_KVK ?? "",
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  },
  termsVersion: "2026-10-concept",
  minimumAge: 16,
} as const;

export const operatorKnown = () => site.operator.legalName.length > 0;
