import Link from "next/link";
import type { Metadata } from "next";
import { ContentPage, OperatorLine } from "@/components/ContentPage";

export const metadata: Metadata = { title: "Privacyverklaring", description: "Welke gegevens Jobmarkt verwerkt, waarom, hoe lang, en welke rechten je hebt.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <ContentPage crumb="Privacy" title="Privacyverklaring" legal updated="31 oktober 2026">
      <h2>Wie is verantwoordelijk?</h2>
      <p>Verwerkingsverantwoordelijke is <OperatorLine />. Vragen over privacy stel je via het <Link href="/contact">contactformulier</Link> (onderwerp ‘Privacy’).</p>

      <h2>Welke gegevens en waarom</h2>
      <table>
        <thead><tr><th>Gegevens</th><th>Waarvoor</th><th>Grondslag</th></tr></thead>
        <tbody>
          <tr><td>E-mailadres, wachtwoord (versleuteld door Supabase Auth)</td><td>Inloggen, accountberichten</td><td>Overeenkomst</td></tr>
          <tr><td>Openbaar profiel: naam, foto, kop, beschrijving, vaardigheden, woonplaats, tarief, portfolio, particulier/zakelijk</td><td>Gevonden worden en samenwerken</td><td>Overeenkomst</td></tr>
          <tr><td>Geboortedatum (nooit openbaar)</td><td>Controle 16+, bescherming van minderjarigen, 18+-categorieën</td><td>Wettelijke verplichting en gerechtvaardigd belang</td></tr>
          <tr><td>E-mail van ouder of voogd, naam bij toestemming</td><td>Toestemming voor 16- en 17-jarigen vastleggen</td><td>Gerechtvaardigd belang (geldigheid van overeenkomsten)</td></tr>
          <tr><td>Opdrachten, vragen, voorstellen, statussen</td><td>De dienst zelf</td><td>Overeenkomst</td></tr>
          <tr><td>Berichten, bijlagen en vrijwillig gedeelde telefoonnummers</td><td>Communicatie tussen de twee deelnemers</td><td>Overeenkomst</td></tr>
          <tr><td>Beoordelingen</td><td>Vertrouwen tussen gebruikers</td><td>Gerechtvaardigd belang</td></tr>
          <tr><td>Meldingen, moderatiebesluiten, auditlog, tellers tegen spam</td><td>Veiligheid, misbruik tegengaan, wettelijke plichten voor hostingdiensten</td><td>Wettelijke verplichting en gerechtvaardigd belang</td></tr>
          <tr><td>Abonnementsstatus; betaalgegevens alleen bij Stripe</td><td>Pro-abonnement</td><td>Overeenkomst en fiscale bewaarplicht</td></tr>
          <tr><td>Contactformulier, wachtlijst</td><td>Je vraag beantwoorden, je één keer informeren</td><td>Toestemming</td></tr>
        </tbody>
      </table>
      <p>We gebruiken je gegevens niet voor advertenties, verkopen ze niet en maken geen profielen voor marketing. We gebruiken geen analyse- of trackingcookies (zie <Link href="/cookies">cookies</Link>).</p>

      <h2>Wie kan wat zien?</h2>
      <ul>
        <li>Iedereen: je openbare profiel, je opdrachten (met alleen de woonplaats), openbare vragen en antwoorden, gepubliceerde beoordelingen.</li>
        <li>Alleen jij: e-mailadres, geboortedatum, meldingen, voorstellen die je stuurde.</li>
        <li>Alleen de opdrachtgever: voorstellen op zijn of haar opdracht.</li>
        <li>Alleen de twee deelnemers: het privégesprek en gedeelde telefoonnummers. Een moderator kan een gesprek alleen inzien zolang er een melding over een bericht in dat gesprek open staat.</li>
      </ul>

      <h2>Verwerkers</h2>
      <p>We werken met dienstverleners die gegevens alleen in onze opdracht verwerken: Supabase (database, opslag en inloggen), Vercel (hosting) en, als betalen is ingeschakeld, Stripe (betalingen) en een e-maildienst. De exacte regio&apos;s en verwerkersovereenkomsten worden vóór de lancering vastgelegd in deze verklaring.</p>

      <h2>Hoe lang bewaren we?</h2>
      <ul>
        <li>Account- en profielgegevens, opdrachten, voorstellen en beoordelingen: zolang je account bestaat.</li>
        <li>Berichten: zolang het gesprek bestaat; verwijder je je account, dan blijft het bericht voor de ander zichtbaar zonder jouw naam.</li>
        <li>Concepten van opdrachten: 6 maanden na de laatste wijziging.</li>
        <li>Tellers tegen spam: 30 dagen. Gelezen meldingen: 1 jaar.</li>
        <li>Afgehandelde meldingen en het contactformulier: 2 jaar. Auditlog van beheeracties: zo lang als nodig voor verantwoording.</li>
        <li>Wachtlijst: maximaal 1 jaar.</li>
        <li>Facturen en betalingen: 7 jaar (fiscale bewaarplicht), bij Stripe.</li>
      </ul>

      <h2>Je rechten</h2>
      <p>Je hebt recht op inzage, correctie, verwijdering, beperking, bezwaar en overdraagbaarheid. Veel kun je zelf: <Link href="/account/instellingen">gegevens downloaden en account verwijderen</Link>. Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de <a href="https://www.autoriteitpersoonsgegevens.nl/">Autoriteit Persoonsgegevens</a>.</p>

      <h2>Minderjarigen</h2>
      <p>Jobmarkt is voor 16 jaar en ouder. Van 16- en 17-jarigen tonen we nooit de leeftijd en ze kunnen die ook niet zelf openbaar maken. Voor overeenkomsten vragen we toestemming van een ouder of voogd.</p>

      <h2>Beveiliging</h2>
      <p>Elke tabel in de database is afgeschermd met rijbeveiliging (Row Level Security): de database zelf bepaalt wie wat mag lezen en wijzigen. Chatbijlagen zijn alleen bereikbaar via tijdelijke, ondertekende links voor de deelnemers. Foto&apos;s worden bij uploaden opnieuw opgeslagen, waarbij locatiegegevens uit de foto verdwijnen.</p>
    </ContentPage>
  );
}
