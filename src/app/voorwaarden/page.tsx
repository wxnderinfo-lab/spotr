import Link from "next/link";
import type { Metadata } from "next";
import { ContentPage, OperatorLine } from "@/components/ContentPage";
import { plans, priceExVat } from "@/config/pricing";
import { euro } from "@/lib/format";

export const metadata: Metadata = { title: "Voorwaarden", description: "De gebruiksvoorwaarden van Jobmarkt, inclusief de voorwaarden voor Jobmarkt Pro.", alternates: { canonical: "/voorwaarden" } };

export default function TermsPage() {
  return (
    <ContentPage crumb="Voorwaarden" title="Gebruiksvoorwaarden" legal updated="31 oktober 2026">
      <h2>1. Wie we zijn en wat Jobmarkt doet</h2>
      <p>Jobmarkt wordt aangeboden door <OperatorLine />. Jobmarkt is een online platform waarop opdrachtgevers opdrachten plaatsen en professionals daarop reageren. Jobmarkt is geen partij bij de afspraak tussen opdrachtgever en professional, is geen werkgever of uitzendbureau en verwerkt geen geld voor opdrachten.</p>

      <h2>2. Account</h2>
      <ul>
        <li>Je moet 16 jaar of ouder zijn. Ben je 16 of 17, dan heb je voor het plaatsen en aannemen van opdrachten toestemming van een ouder of voogd nodig; betaalde functies zijn er pas vanaf 18.</li>
        <li>Je geeft juiste gegevens op, ook je geboortedatum en of je als particulier of als bedrijf werkt.</li>
        <li>Je houdt je wachtwoord geheim en bent verantwoordelijk voor wat er met je account gebeurt.</li>
      </ul>

      <h2>3. Opdrachten en voorstellen</h2>
      <ul>
        <li>Een opdracht moet echt zijn, binnen de <Link href="/communityregels">communityregels</Link> vallen en duidelijk omschreven zijn.</li>
        <li>Een voorstel is een aanbod van de professional aan de opdrachtgever. Accepteert de opdrachtgever het voorstel, dan maken zij samen verdere afspraken. De overeenkomst over het werk ontstaat tussen hen, niet met Jobmarkt.</li>
        <li>Is de professional een bedrijf, dan heeft een consument de rechten uit het consumentenrecht tegenover dat bedrijf. Bij een particuliere professional gelden die rechten niet.</li>
      </ul>

      <h2 id="rangschikking">4. Rangschikking</h2>
      <p>Hoe we zoekresultaten ordenen, staat op <Link href="/hoe-het-werkt#rangschikking">Hoe het werkt</Link>. Betalen geeft geen hogere positie.</p>

      <h2>5. Beoordelingen</h2>
      <p>Beoordelingen kunnen alleen worden gegeven door de deelnemers van een via Jobmarkt afgeronde opdracht. Hoe dat werkt en wanneer we een beoordeling verbergen, staat op <Link href="/hoe-het-werkt#beoordelingen">Hoe het werkt</Link> en in de communityregels.</p>

      <h2 id="abonnement">6. Jobmarkt Pro</h2>
      <ul>
        <li>Pro kost {euro(plans.pro.priceCents, true)} per maand inclusief 21% btw ({euro(priceExVat(plans.pro.priceCents), true)} exclusief btw), vooraf per maand te betalen via Stripe.</li>
        <li>Het abonnement verlengt automatisch per maand en is op elk moment op te zeggen in je account. Je houdt Pro tot het einde van de betaalde maand; we betalen geen losse dagen terug, behalve bij gebruik van het herroepingsrecht.</li>
        <li>Consumenten hebben 14 dagen bedenktijd. Wie Pro in die periode al gebruikt, betaalt naar verhouding voor de gebruikte periode.</li>
        <li>Pro geeft geen garantie op opdrachten, geen hogere positie in zoekresultaten en geen toegang tot contactgegevens van anderen.</li>
        <li>We kondigen prijswijzigingen minimaal 30 dagen vooraf aan; je kunt dan opzeggen voordat de nieuwe prijs ingaat.</li>
      </ul>

      <h2>7. Moderatie en maatregelen</h2>
      <p>We kunnen inhoud verbergen of een account schorsen als de communityregels of deze voorwaarden worden overtreden. Je krijgt altijd een gemotiveerd besluit en kunt bezwaar maken.</p>

      <h2>8. Aansprakelijkheid</h2>
      <p>Jobmarkt is niet aansprakelijk voor de uitvoering, kwaliteit of betaling van opdrachten tussen gebruikers. Onze aansprakelijkheid is beperkt tot wat de wet toestaat. [Exacte beperking wordt vóór lancering juridisch vastgesteld.]</p>

      <h2>9. Opzeggen en verwijderen</h2>
      <p>Je kunt je account op elk moment verwijderen in je instellingen, zodra je geen lopende opdrachten of actief abonnement meer hebt.</p>

      <h2>10. Wijzigingen en toepasselijk recht</h2>
      <p>We kunnen deze voorwaarden aanpassen; bij belangrijke wijzigingen laten we dat vooraf weten. Op deze voorwaarden is Nederlands recht van toepassing.</p>
    </ContentPage>
  );
}
