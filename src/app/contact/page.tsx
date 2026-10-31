import Link from "next/link";
import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { sendContact } from "@/actions/public";
import { getMe } from "@/lib/auth";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Vraag over Jobmarkt, je account of privacy? Stuur ons een bericht.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const me = await getMe();
  return (
    <ContentPage crumb="Contact" title="Contact" intro={<>Kijk eerst even in het <Link href="/help" className="link">helpcentrum</Link>; daar staan de meeste antwoorden.</>}>
      <ul>
        <li>Iets ongepasts gezien? Gebruik ‘Melden’ bij de opdracht, het profiel of het bericht. Dan komt het direct bij de moderatie.</li>
        <li>Een vraag over een opdracht? Stel die openbaar bij de opdracht of in je privégesprek.</li>
        <li>Privacyverzoek (inzage, verwijderen)? Dat kan grotendeels zelf in <Link href="/account/instellingen">Instellingen en privacy</Link>, of kies hieronder ‘Privacy’.</li>
      </ul>
      {site.operator.email && <p>E-mail: <a href={`mailto:${site.operator.email}`}>{site.operator.email}</a></p>}
      <div className="not-prose mt-8">
        <ActionForm action={sendContact} hideOnSuccess className="card grid gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="c-name" className="label">Naam</label><input id="c-name" name="name" required minLength={2} maxLength={100} defaultValue={me?.profile.display_name} autoComplete="name" className="input" /></div>
            <div><label htmlFor="c-email" className="label">E-mailadres</label><input id="c-email" name="email" type="email" required defaultValue={me?.email} autoComplete="email" className="input" /></div>
          </div>
          <div>
            <label htmlFor="c-topic" className="label">Onderwerp</label>
            <select id="c-topic" name="topic" className="input">
              <option value="vraag">Vraag over Jobmarkt</option>
              <option value="account">Mijn account</option>
              <option value="privacy">Privacy</option>
              <option value="melding">Melding of klacht</option>
              <option value="pers">Pers of samenwerking</option>
              <option value="anders">Anders</option>
            </select>
          </div>
          <div><label htmlFor="c-msg" className="label">Bericht</label><textarea id="c-msg" name="message" required minLength={10} maxLength={4000} rows={6} className="input" /></div>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <p className="text-xs text-muted">We gebruiken je gegevens alleen om je vraag te beantwoorden en bewaren het bericht maximaal 2 jaar.</p>
          <div><SubmitButton>Versturen</SubmitButton></div>
        </ActionForm>
      </div>
    </ContentPage>
  );
}
