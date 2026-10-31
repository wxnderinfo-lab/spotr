import Link from "next/link";
import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Helpcentrum",
  description: "Antwoorden op veelgestelde vragen over opdrachten plaatsen, voorstellen, betalen, beoordelingen, privacy en je account.",
  alternates: { canonical: "/help" },
};

const faq: [string, string, React.ReactNode][] = [
  ["opdracht", "Kost een opdracht plaatsen iets?", <>Nee. Plaatsen, voorstellen ontvangen en kiezen is gratis. <Link href="/prijzen">Meer over prijzen</Link>.</>],
  ["zichtbaar", "Wie ziet mijn opdracht?", "Iedereen, ook zonder account. Alleen je woonplaats is zichtbaar, nooit je adres of contactgegevens. Na 30 dagen sluit je opdracht automatisch."],
  ["wijzigen", "Kan ik mijn opdracht nog aanpassen?", "Ja, zolang er nog geen voorstellen zijn. Daarna kun je hem annuleren en opnieuw plaatsen, zodat professionals niet reageren op iets dat later verandert."],
  ["controle", "Waarom wordt mijn opdracht gecontroleerd?", "Als je tekst een link, contactgegevens of een signaalwoord bevat, kijkt een moderator mee voordat hij openbaar wordt. Meestal binnen een werkdag."],
  ["betalen", "Hoe betaal ik de professional?", "Dat spreken jullie samen af in het privégesprek. Jobmarkt houdt geen geld vast en is geen partij bij jullie afspraak."],
  ["limiet", "Mijn gratis voorstellen zijn op. Wat nu?", "Op de eerste van de volgende maand kun je weer 5 voorstellen sturen. Opdrachten die al geaccepteerd zijn, kun je gewoon afronden. Met Pro is er geen maandlimiet."],
  ["categorie", "Waarom kan ik niet reageren op een opdracht?", "Je kunt alleen reageren in de categorieën van je profiel, op open opdrachten, en niet als je geblokkeerd bent. 16- en 17-jarigen hebben toestemming nodig en kunnen niet in 18+-categorieën reageren."],
  ["beoordeling", "Wanneer zie ik mijn beoordeling?", "Als jullie allebei hebben beoordeeld, of 14 dagen na afronden. Dat heet dubbelblind en voorkomt dat iemand terugslaat met een slechte beoordeling."],
  ["melden", "Hoe meld ik iets?", <>Onder elke opdracht, elk profiel, elke beoordeling en elk bericht staat ‘Melden’. Je krijgt een gemotiveerd besluit. Je meldingen zie je in <Link href="/account/meldingen-en-bezwaar">Meldingen en bezwaar</Link>.</>],
  ["nummer", "Ik heb mijn nummer gedeeld en wil dat niet meer.", "Kies in het gesprek ‘Niet meer delen’. De ander ziet het nummer dan niet meer op Jobmarkt, maar als die het al had genoteerd, kunnen we dat niet terughalen."],
  ["16", "Ik ben 16 of 17. Kan ik meedoen?", <>Ja. Voor opdrachten plaatsen of aannemen vraag je eerst toestemming aan een ouder of voogd via <Link href="/account/instellingen#toestemming">Instellingen</Link>. Sommige categorieën en betaalde functies zijn 18+.</>],
  ["verwijderen", "Hoe verwijder ik mijn account of download ik mijn gegevens?", <>In <Link href="/account/instellingen">Instellingen en privacy</Link>. Lopende opdrachten rond je eerst af.</>],
];

export default function HelpPage() {
  return (
    <ContentPage crumb="Helpcentrum" title="Helpcentrum" intro={<>Staat je vraag er niet bij? <Link href="/contact" className="link">Neem contact op</Link>.</>}>
      <nav aria-label="Vragen" className="not-prose mb-8">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">{faq.map(([id, q]) => <li key={id}><a href={`#${id}`} className="link">{q}</a></li>)}</ul>
      </nav>
      {faq.map(([id, q, a]) => (
        <section key={id} id={id} className="scroll-mt-24">
          <h2>{q}</h2>
          <p>{a}</p>
        </section>
      ))}
    </ContentPage>
  );
}
