import type { Metadata } from "next";
import { confirmGuardianConsent } from "@/actions/account";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Toestemming geven", robots: { index: false, follow: false } };

// Pagina voor de ouder of voogd. De link (met eenmalige token) komt per e-mail.
export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-3xl font-extrabold">Toestemming voor Jobmarkt</h1>
      <div className="prose-jm mt-4">
        <p>Uw kind (16 of 17 jaar) heeft een account op Jobmarkt en vraagt u om toestemming om opdrachten te plaatsen en voorstellen te sturen aan opdrachtgevers.</p>
        <h2>Wat betekent dit?</h2>
        <ul>
          <li>Uw kind kan zelf afspraken maken over kleine opdrachten, zoals oppassen op huisdieren, tuinwerk of bijles. Jobmarkt is geen werkgever en verwerkt geen opdrachtgeld.</li>
          <li>Betaalde functies van Jobmarkt (zoals Pro) blijven geblokkeerd tot uw kind 18 is. Categorieën met risico of wettelijke eisen zijn 18+.</li>
          <li>De geboortedatum van uw kind is nooit openbaar; de leeftijd wordt niet getoond.</li>
          <li>Uw kind kan de toestemming zelf intrekken. U kunt ons altijd vragen de toestemming in te trekken of het account te sluiten.</li>
        </ul>
        <p>Let op: als uw kind als ondernemer werkt, gelden er regels voor inschrijving bij de KVK en voor belasting. Zie <a href="https://ondernemersplein.overheid.nl/wetten-en-regels/regels-voor-minderjarige-ondernemers/">Ondernemersplein: regels voor minderjarige ondernemers</a>.</p>
      </div>
      {token ? (
        <ActionForm action={confirmGuardianConsent} hideOnSuccess className="card mt-8 space-y-4 p-5">
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="naam" className="label">Uw volledige naam</label>
            <input id="naam" name="naam" required minLength={3} maxLength={120} className="input" autoComplete="name" />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
            <span>Ik ben ouder of voogd met gezag en geef toestemming zoals hierboven beschreven.</span>
          </label>
          <SubmitButton>Toestemming geven</SubmitButton>
        </ActionForm>
      ) : (
        <p className="mt-8 text-ink-soft">Deze link is onvolledig. Gebruik de link uit de e-mail.</p>
      )}
    </div>
  );
}
