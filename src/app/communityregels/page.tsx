import Link from "next/link";
import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Communityregels",
  description: "Welke opdrachten en diensten wel en niet op Jobmarkt horen, regels voor berichten en beoordelingen, en hoe moderatie en bezwaar werken.",
  alternates: { canonical: "/communityregels" },
};

export default function CommunityRules() {
  return (
    <ContentPage crumb="Communityregels" title="Communityregels" legal updated="31 oktober 2026" intro="Jobmarkt werkt alleen als iedereen erop kan vertrouwen. Deze regels gelden voor opdrachten, profielen, diensten, vragen, berichten en beoordelingen.">
      <h2 id="niet-toegestaan">Wat niet op Jobmarkt hoort</h2>
      <p>Sommige diensten zijn verboden; andere vragen een vergunning, registratie of bescherming die wij op dit moment niet kunnen controleren. Die laten we daarom (nog) niet toe.</p>
      <table>
        <thead><tr><th>Niet toegestaan</th><th>Waarom</th></tr></thead>
        <tbody>
          <tr><td>Illegale activiteiten, drugs, wapens, gokken, vervalsing, zwart werk, witwassen</td><td>Verboden</td></tr>
          <tr><td>Erotische of seksuele diensten</td><td>Niet passend en risico op uitbuiting</td></tr>
          <tr><td>Kinderopvang en oppassen op kinderen</td><td>Kinderopvang vraagt registratie en waarborgen voor veiligheid; we bouwen geen eigen controle (zoals een VOG-check) in</td></tr>
          <tr><td>Zorg en medische handelingen</td><td>Veel handelingen zijn voorbehouden aan BIG-geregistreerde zorgverleners</td></tr>
          <tr><td>Personenvervoer (taxi)</td><td>Vereist vergunning en chauffeurskaart</td></tr>
          <tr><td>Beveiliging en bewaking</td><td>Vereist toestemming onder de Wet particuliere beveiligingsorganisaties</td></tr>
          <tr><td>Financieel advies en bemiddeling</td><td>Valt onder toezicht (Wet op het financieel toezicht)</td></tr>
          <tr><td>Asbest verwijderen</td><td>Alleen door gecertificeerde bedrijven</td></tr>
          <tr><td>Rijlessen</td><td>Vereist een rij-instructeurscertificaat</td></tr>
          <tr><td>Schoolwerk, scripties of tentamens voor een ander maken</td><td>Fraude</td></tr>
          <tr><td>Nepbeoordelingen, volgers of likes kopen of verkopen</td><td>Misleiding; verboden voor consumentenmarkten</td></tr>
          <tr><td>Hacken, wachtwoorden kraken, toegang tot andermans accounts</td><td>Strafbaar</td></tr>
        </tbody>
      </table>
      <p>Voor een aantal toegestane klussen gelden extra eisen, zoals een CO-certificaat voor werk aan cv-ketels en gastoestellen. Dat staat bij de categorie. Sommige categorieën zijn alleen voor professionals van 18 jaar en ouder.</p>

      <h2 id="inhoud">Openbare teksten</h2>
      <ul>
        <li>Geen telefoonnummers, e-mailadressen, adressen of links in opdrachten, profielen, vragen, voorstellen of beoordelingen. Contact delen kan na acceptatie in het privégesprek.</li>
        <li>Alleen eigen werk in je portfolio. Personen alleen herkenbaar met hun toestemming. Videolinks alleen naar YouTube of Vimeo.</li>
        <li>Geen discriminatie, intimidatie, bedreiging of beledigingen.</li>
        <li>Eén account per persoon. Geen opdrachten of profielen namens een ander zonder toestemming.</li>
      </ul>

      <h2 id="beoordelingen">Beoordelingen</h2>
      <ul>
        <li>Alleen over de opdracht die je samen deed, eerlijk en zonder persoonsgegevens.</li>
        <li>Geen beoordelingen in ruil voor korting of geld, en geen druk om een beoordeling te veranderen.</li>
        <li>We verbergen een beoordeling alleen als die deze regels overtreedt, niet omdat hij negatief is. Verborgen beoordelingen tellen niet mee in het gemiddelde, en op het profiel staat hoeveel er zijn verborgen.</li>
      </ul>

      <h2 id="moderatie">Hoe we modereren</h2>
      <ol>
        <li>Opdrachten met links, contactgegevens of signaalwoorden worden automatisch tegengehouden tot een moderator ze heeft bekeken. Verder grijpen we in op basis van meldingen.</li>
        <li>Een moderator beoordeelt de melding tegen deze regels en neemt een besluit: geen actie, inhoud verbergen, of (door een admin) een account schorsen.</li>
        <li>Elk besluit heeft een motivering. De melder en de betrokkene krijgen een bericht, en het besluit komt in een auditlog.</li>
        <li>Moderators kunnen een privégesprek alleen inzien zolang er een melding over een bericht in dat gesprek open staat.</li>
      </ol>

      <h2 id="bezwaar">Bezwaar</h2>
      <p>Niet eens met een besluit? Maak bezwaar via <Link href="/account/meldingen-en-bezwaar">Meldingen en bezwaar</Link>. Iemand die niet bij het eerste besluit betrokken was, bekijkt het opnieuw.</p>

      <h2 id="minderjarigen">Minderjarigen</h2>
      <p>Zorgen over de veiligheid van een minderjarige? Meld het met de reden ‘Zorg over een minderjarige’. Zulke meldingen behandelen we met voorrang.</p>
    </ContentPage>
  );
}
