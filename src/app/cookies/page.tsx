import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = { title: "Cookies", description: "Jobmarkt gebruikt alleen noodzakelijke cookies om je ingelogd te houden. Geen tracking.", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <ContentPage crumb="Cookies" title="Cookies" legal updated="31 oktober 2026">
      <p>Jobmarkt gebruikt alleen wat nodig is om de site te laten werken. Daarom vragen we geen toestemming via een cookiebanner.</p>
      <table>
        <thead><tr><th>Naam</th><th>Waarvoor</th><th>Bewaartermijn</th></tr></thead>
        <tbody>
          <tr><td><code>sb-…-auth-token</code></td><td>Je ingelogd houden (Supabase Auth)</td><td>Tot je uitlogt of de sessie verloopt</td></tr>
        </tbody>
      </table>
      <p>Daarnaast bewaren we in je eigen browser (localStorage) een begonnen opdracht, zodat die niet verloren gaat als je tussendoor een account maakt. Dat verlaat je apparaat niet tot je de opdracht opslaat, en verdwijnt zodra je hem opslaat.</p>
      <p>We gebruiken geen analyse-, advertentie- of social-mediacookies. Als we ooit statistieken willen meten, kiezen we een privacyvriendelijke oplossing en passen we deze pagina eerst aan; voor alles wat niet strikt noodzakelijk is, vragen we dan eerst je toestemming.</p>
    </ContentPage>
  );
}
