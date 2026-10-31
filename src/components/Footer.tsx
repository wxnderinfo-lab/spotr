import Link from "next/link";
import { site } from "@/config/site";
import { LogoMark } from "./Logo";

const columns = [
  {
    title: "Opdrachtgevers",
    links: [
      ["/opdracht-plaatsen", "Plaats een opdracht"],
      ["/professionals", "Vind een professional"],
      ["/categorieen", "Alle categorieën"],
      ["/kennisbank/duidelijke-opdracht-schrijven", "Een goede opdracht schrijven"],
    ],
  },
  {
    title: "Professionals",
    links: [
      ["/opdrachten", "Vind werk"],
      ["/prijzen", "Gratis en Pro"],
      ["/kennisbank/starten-als-zelfstandige", "Starten als zelfstandige"],
      ["/aanmelden", "Profiel aanmaken"],
    ],
  },
  {
    title: "Jobmarkt",
    links: [
      ["/hoe-het-werkt", "Hoe het werkt"],
      ["/over-jobmarkt", "Over Jobmarkt"],
      ["/kennisbank", "Kennisbank"],
      ["/help", "Helpcentrum"],
      ["/contact", "Contact"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-extrabold tracking-tight">
            <LogoMark className="h-7 w-7" /> Jobmarkt
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Opdrachten plaatsen en werk vinden, lokaal en online. Gratis plaatsen, geen kosten per contact.
          </p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-sm font-semibold">{c.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-ink-soft hover:text-ink hover:underline">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li><Link href="/voorwaarden" className="hover:text-ink hover:underline">Voorwaarden</Link></li>
            <li><Link href="/privacy" className="hover:text-ink hover:underline">Privacy</Link></li>
            <li><Link href="/cookies" className="hover:text-ink hover:underline">Cookies</Link></li>
            <li><Link href="/communityregels" className="hover:text-ink hover:underline">Communityregels</Link></li>
          </ul>
          <p>
            © {new Date().getFullYear()} Jobmarkt · Gebouwd door{" "}
            <a href={site.maker.url} className="hover:text-ink hover:underline">{site.maker.name}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
