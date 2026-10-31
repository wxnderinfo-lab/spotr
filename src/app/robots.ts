import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// robots.txt is geen beveiliging: privépagina's zijn afgeschermd door inloggen
// en RLS. We blokkeren alleen routes die voor crawlers nooit inhoud hebben.
// Gefilterde zoekpagina's blokkeren we NIET, anders ziet Google hun
// noindex-tag niet; die pagina's regelen het zelf met noindex,follow.
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.ALLOW_INDEXING === "true";
  if (!isProduction) {
    // previews en lokaal: niets indexeren
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/account", "/berichten", "/beheer", "/auth/", "/welkom", "/toestemming"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
