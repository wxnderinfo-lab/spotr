import Link from "next/link";
import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Over Jobmarkt",
  description: "Waarom Jobmarkt bestaat: lokale klussen en online werk op één plek, zonder kosten per contact, met eerlijke beoordelingen.",
  alternates: { canonical: "/over-jobmarkt" },
};

export default function AboutPage() {
  return (
    <ContentPage crumb="Over Jobmarkt" title="Over Jobmarkt" intro="Een marktplaats voor werk die eerlijk is over wat hij wel en niet doet.">
      <p>
        Wie een klus wil laten doen, zoekt vaak op verschillende plekken: de ene site voor een schilder, de andere voor een video-editor. En wie als professional werk zoekt, betaalt op veel platforms per lead of per contact, of een groot deel van zijn verdiensten.
        Jobmarkt brengt lokale en online opdrachten samen en kiest voor een ander model: opdrachtgevers betalen niets, professionals reageren gratis of nemen een vast abonnement, nooit per contact.
      </p>
      <h2>Waar we voor staan</h2>
      <ul>
        <li><strong>Geen nepdrukte.</strong> We tonen alleen echte opdrachten, profielen en beoordelingen. Is een categorie nog leeg, dan zeggen we dat.</li>
        <li><strong>Uitlegbaar.</strong> Je ziet waarom iets bovenaan staat, en niemand kan een hogere positie of een vertrouwensbadge kopen.</li>
        <li><strong>Privacy eerst.</strong> Contactgegevens zijn nooit openbaar en delen is altijd vrijwillig.</li>
        <li><strong>Ruimte voor starters.</strong> Je portfolio en een goed voorstel tellen ook als je nog geen beoordelingen hebt.</li>
      </ul>
      <h2>Waar we eerlijk over zijn</h2>
      <p>
        Jobmarkt is net gestart. We bemiddelen niet in betalingen en bieden (nog) geen betaalbescherming. We controleren geen identiteit; ‘KVK gecontroleerd’ betekent dat we een inschrijving handmatig in het Handelsregister hebben opgezocht.
      </p>
      <h2>Wie</h2>
      <p>
        De website is ontworpen en gebouwd door <a href={site.maker.url}>{site.maker.name}</a>. De gegevens van de juridische exploitant staan in de <Link href="/voorwaarden">voorwaarden</Link> en <Link href="/privacy">privacyverklaring</Link>.
      </p>
    </ContentPage>
  );
}
