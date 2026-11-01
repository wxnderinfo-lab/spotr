import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { site } from "@/config/site";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";
import { JsonLd } from "@/components/JsonLd";
import { LiveProvider } from "@/components/live/LiveProvider";
import { getMe } from "@/lib/auth";

// Schibsted Grotesk: SIL Open Font License 1.1, latin-ext voor ë, é, ï, ĳ.
// next/font host het lettertype zelf (geen verzoek naar Google bij bezoek).
const schibsted = Schibsted_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-schibsted",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Jobmarkt: opdrachten plaatsen en werk vinden", template: "%s | Jobmarkt" },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", locale: site.locale, siteName: site.name },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#111315" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const page = (
    <>
      <Header />
      <main id="inhoud" className="pb-20 sm:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </>
  );
  return (
    <html lang="nl" className={schibsted.variable}>
      <body className="min-h-dvh font-sans antialiased">
        {me ? (
          <LiveProvider meId={me.id} initial={{ messages: me.status.unread_messages, notifications: me.status.unread_notifications }}>
            {page}
          </LiveProvider>
        ) : page}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${site.url}/#organisatie`,
                name: site.name,
                url: site.url,
                logo: `${site.url}/logo.png`,
                ...(site.operator.legalName ? { legalName: site.operator.legalName } : {}),
              },
              {
                "@type": "WebSite",
                "@id": `${site.url}/#website`,
                name: site.name,
                url: site.url,
                inLanguage: "nl-NL",
                publisher: { "@id": `${site.url}/#organisatie` },
              },
            ],
          }}
        />
      </body>
    </html>
  );
}
