import Link from "next/link";
import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { plans } from "@/config/pricing";

export const metadata: Metadata = {
  title: "Hoe het werkt",
  description: "Van opdracht plaatsen tot afronden: hoe Jobmarkt werkt voor opdrachtgevers en professionals, hoe we zoekresultaten rangschikken en hoe beoordelingen ontstaan.",
  alternates: { canonical: "/hoe-het-werkt" },
};

export default function HowItWorks() {
  return (
    <ContentPage crumb="Hoe het werkt" title="Hoe Jobmarkt werkt" intro="Eén account, twee rollen. Je plaatst opdrachten, je werkt als professional, of allebei.">
      <h2 id="opdrachtgevers">Voor opdrachtgevers</h2>
      <ol>
        <li><strong>Kijk rond</strong> zonder account. Bekijk professionals, categorieën en de kennisbank.</li>
        <li><strong>Beschrijf je opdracht</strong>: wat, waar (alleen je woonplaats), wanneer en je budget. Je ziet een voorbeeld voordat hij online gaat. Plaatsen is gratis.</li>
        <li><strong>Ontvang voorstellen</strong> met prijs, planning en eerder werk. Professionals kunnen openbare vragen stellen onder je opdracht, zonder contactgegevens.</li>
        <li><strong>Vergelijk en kies</strong>. Accepteer je een voorstel, dan worden de andere netjes gesloten en opent er een privégesprek.</li>
        <li><strong>Regel het samen</strong>. In het gesprek kun je bestanden delen en, als je dat wilt, je telefoonnummer.</li>
        <li><strong>Rond af en beoordeel</strong>. Na oplevering keur je het werk goed. Daarna beoordelen jullie elkaar.</li>
      </ol>

      <h2 id="professionals">Voor professionals</h2>
      <ol>
        <li><strong>Maak je profiel</strong>: wat je doet, waar je werkt (of online), je categorieën, portfolio en beschikbaarheid.</li>
        <li><strong>Vind passende opdrachten</strong>. Met ‘Beste match’ zie je eerst wat bij jouw categorieën, vaardigheden, reisafstand en tarief past.</li>
        <li><strong>Stuur een voorstel</strong>. Gratis: {plans.gratis.proposalsPerMonth} nieuwe voorstellen per kalendermaand. Met Pro geen maandlimiet. Je betaalt nooit per lead of per contact.</li>
        <li><strong>Word gekozen, voer uit en rond af</strong>. Een geaccepteerde opdracht kun je altijd afronden en bespreken, ook als je limiet op is.</li>
      </ol>

      <h2 id="betalen">Betalen voor het werk</h2>
      <p>
        Opdrachtgever en professional spreken de prijs en betaling samen af en rekenen rechtstreeks af. Jobmarkt houdt geen geld vast, biedt geen escrow of kopersbescherming en is geen partij bij jullie afspraak.
        Daarom: maak duidelijke afspraken in het gesprek en betaal bij voorkeur niet alles vooraf.
      </p>

      <h2 id="rangschikking">Hoe we zoekresultaten rangschikken</h2>
      <p>We vinden dat je moet kunnen zien waarom iets bovenaan staat. Er is geen willekeur en je kunt geen hogere positie kopen. Ook Pro geeft geen voorrang.</p>
      <h3>Opdrachten</h3>
      <ul>
        <li><strong>Nieuwste eerst</strong> (standaard voor bezoekers): op publicatiedatum.</li>
        <li><strong>Beste match</strong> (voor ingelogde professionals): een score uit categorie (40), vaardigheden in de tekst (20), online werken of binnen je reisafstand (20) en budget dat past bij je uurtarief (10, of 5 bij ‘in overleg’). Bij gelijke score: nieuwste eerst. Bij elke opdracht zie je welke punten meetellen.</li>
        <li><strong>Dichtstbij</strong> en <strong>hoogste budget</strong> doen wat ze zeggen.</li>
      </ul>
      <h3>Professionals</h3>
      <ul>
        <li><strong>Relevant</strong> (standaard): eerst hoe goed je zoekwoord overeenkomt met naam, kop en vaardigheden, dan beschikbaarheid, dan afstand.</li>
        <li>Beoordelingen tellen alleen mee als je zelf op ‘hoogste beoordeling’ sorteert of filtert. Zo krijgen goede starters zonder beoordelingen ook een kans.</li>
      </ul>
      <p>Als we ooit betaalde plaatsingen toevoegen, staan ze apart en zijn ze duidelijk gemarkeerd als ‘Gesponsord’.</p>

      <h2 id="beoordelingen">Hoe beoordelingen werken</h2>
      <ul>
        <li>Alleen de opdrachtgever en de gekozen professional van een <strong>afgeronde opdracht op Jobmarkt</strong> kunnen elkaar beoordelen. Eén beoordeling per persoon per opdracht. Een profiel zonder opdracht kun je niet beoordelen.</li>
        <li><strong>Dubbelblind</strong>: je ziet de beoordeling van de ander pas als jullie allebei hebben beoordeeld, of na 14 dagen. Zo kan niemand zijn oordeel aanpassen aan dat van de ander.</li>
        <li>Je kunt tot 30 dagen na afronden beoordelen. De beoordeelde kan één keer inhoudelijk reageren.</li>
        <li>Gemiddelden berekenen we alleen uit gepubliceerde beoordelingen. Wij kopen, schrijven of verwijderen geen beoordelingen om iemand mooier of slechter te maken.</li>
        <li>Een beoordeling die de <Link href="/communityregels#beoordelingen">communityregels</Link> overtreedt, kan na een melding worden verborgen. Op het profiel staat dan hoeveel beoordelingen zijn verborgen; de schrijver krijgt een gemotiveerd besluit en kan bezwaar maken.</li>
      </ul>

      <h2 id="contact">Contactgegevens en bellen</h2>
      <p>
        Telefoonnummers, e-mailadressen en adressen zijn nooit openbaar. Vóór je keuze stel je vragen openbaar bij de opdracht. Na acceptatie kun je in het privégesprek vrijwillig je nummer delen; de ander krijgt dan een belknop die de telefoon-app van zijn toestel opent.
        Je kunt delen weer intrekken, maar een nummer dat de ander al heeft gezien of gebeld, kunnen we niet terughalen. Een abonnement geeft nooit toegang tot contactgegevens.
      </p>

      <h2 id="leeftijd">Leeftijd</h2>
      <p>Jobmarkt is voor iedereen van 16 jaar en ouder. 16- en 17-jarigen hebben toestemming van een ouder of voogd nodig om opdrachten te plaatsen of aan te nemen, sommige categorieën zijn 18+, en betaalde functies zijn er pas vanaf 18. Je geboortedatum is nooit zichtbaar voor anderen.</p>
    </ContentPage>
  );
}
