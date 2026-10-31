import Link from "next/link";
import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { Notice, PageHeader } from "@/components/ui";
import { requestGuardianConsent, revokeGuardianConsent, updatePrivacy } from "@/actions/account";
import { signOut } from "@/actions/auth";

export const metadata: Metadata = { title: "Instellingen en privacy" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ minderjarig?: string; fout?: string }> }) {
  const me = await requireMe("/account/instellingen");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: priv }, { data: prof }, { data: canDelete }] = await Promise.all([
    supabase.from("profile_private").select("birthdate, guardian_email, guardian_consent_status, guardian_consent_at, marketing_opt_in, accepted_terms_version, accepted_terms_at").eq("id", me.id).single(),
    supabase.from("profiles").select("show_age").eq("id", me.id).single(),
    supabase.rpc("can_delete_account"),
  ]);
  const s = me.status;
  return (
    <>
      <PageHeader title="Instellingen en privacy" />
      <div className="space-y-8">
        <section className="card p-5 sm:p-6" aria-labelledby="gegevens">
          <h2 id="gegevens" className="text-lg font-bold">Je gegevens</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[12rem_1fr]">
            <dt className="text-muted">E-mailadres</dt><dd>{me.email} <span className="text-muted">(nooit openbaar)</span></dd>
            <dt className="text-muted">Geboortedatum</dt><dd>{priv?.birthdate ? formatDate(priv.birthdate) : "Niet ingevuld"} <span className="text-muted">(nooit openbaar)</span></dd>
            <dt className="text-muted">Voorwaarden</dt><dd>Versie {priv?.accepted_terms_version ?? "-"}{priv?.accepted_terms_at ? `, geaccepteerd op ${formatDate(priv.accepted_terms_at)}` : ""}</dd>
          </dl>
          <p className="mt-3 text-sm text-muted">Klopt je geboortedatum niet? Neem <Link className="link" href="/contact">contact</Link> op. Om misbruik te voorkomen kun je hem niet zelf wijzigen.</p>
        </section>

        {s.is_minor && (
          <section id="toestemming" className="card scroll-mt-24 p-5 sm:p-6" aria-labelledby="toestemming-titel">
            <h2 id="toestemming-titel" className="text-lg font-bold">Toestemming van je ouder of voogd</h2>
            {sp.minderjarig && <div className="mt-3"><Notice tone="info" title="Je account is klaar">Je bent 16 of 17. Je kunt rondkijken en je profiel invullen. Voor opdrachten plaatsen of voorstellen sturen vragen we eerst toestemming van een ouder of voogd.</Notice></div>}
            <p className="mt-2 text-sm text-ink-soft">
              Tot je 18e heb je volgens de wet voor de meeste overeenkomsten toestemming van je ouders of voogd nodig. Daarom sturen we hen een link waarmee ze toestemming kunnen geven.
              Betaalde functies, zoals Pro, zijn niet beschikbaar tot je 18 bent. Sommige categorieën zijn 18+.
            </p>
            <p className="mt-3 text-sm"><strong>Status:</strong> {{ niet_nodig: "Nog niet aangevraagd", aangevraagd: `Aangevraagd bij ${priv?.guardian_email}`, bevestigd: `Bevestigd op ${priv?.guardian_consent_at ? formatDate(priv.guardian_consent_at) : ""}`, ingetrokken: "Ingetrokken" }[(priv?.guardian_consent_status ?? "niet_nodig") as "niet_nodig"]}</p>
            {priv?.guardian_consent_status !== "bevestigd" && (
              <ActionForm action={requestGuardianConsent} hideOnSuccess className="mt-4 flex flex-wrap items-end gap-2">
                <div className="min-w-64 flex-1"><label htmlFor="g-email" className="label">E-mailadres van je ouder of voogd</label><input id="g-email" name="email" type="email" required className="input" /></div>
                <SubmitButton className="btn-secondary">Toestemming vragen</SubmitButton>
              </ActionForm>
            )}
            {(priv?.guardian_consent_status === "bevestigd" || priv?.guardian_consent_status === "aangevraagd") && (
              <form action={revokeGuardianConsent} className="mt-3"><button type="submit" className="text-sm text-muted hover:underline">Toestemming of aanvraag intrekken</button></form>
            )}
          </section>
        )}

        <section className="card p-5 sm:p-6" aria-labelledby="privacy">
          <h2 id="privacy" className="text-lg font-bold">Privacy</h2>
          <ActionForm action={updatePrivacy} className="mt-3 space-y-3">
            <label className={`flex items-start gap-3 ${s.is_minor ? "opacity-60" : ""}`}>
              <input type="checkbox" name="show_age" defaultChecked={prof?.show_age} disabled={s.is_minor} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
              <span><span className="font-medium">Mijn leeftijd tonen op mijn profiel</span><span className="block text-sm text-muted">{s.is_minor ? "Niet mogelijk onder de 18." : "Alleen je leeftijd in jaren, nooit je geboortedatum. Standaard uit."}</span></span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="marketing" defaultChecked={priv?.marketing_opt_in} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
              <span><span className="font-medium">Af en toe nieuws over Jobmarkt per e-mail</span><span className="block text-sm text-muted">Hooguit één keer per maand. Meldingen over je opdrachten krijg je altijd.</span></span>
            </label>
            <SubmitButton className="btn-secondary">Opslaan</SubmitButton>
          </ActionForm>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="data">
          <h2 id="data" className="text-lg font-bold">Je gegevens downloaden of je account verwijderen</h2>
          <p className="mt-2 text-sm text-ink-soft">Je hebt recht op inzage en een kopie van je gegevens (AVG). De download is een JSON-bestand met je profiel, opdrachten, voorstellen, verstuurde berichten en beoordelingen.</p>
          <a href="/api/account/export" className="btn-secondary mt-3" download>Mijn gegevens downloaden</a>
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="font-semibold">Account verwijderen</h3>
            {canDelete === "ok" ? (
              <>
                <p className="mt-1 text-sm text-ink-soft">Je profiel, portfolio, diensten, opdrachten en beoordelingen die je schreef worden verwijderd. Berichten blijven voor de andere deelnemer zichtbaar zonder jouw naam. Dit kan niet ongedaan worden gemaakt.</p>
                {sp.fout && <p className="mt-2 text-sm font-medium text-danger">Bevestig door VERWIJDER te typen.</p>}
                <form action="/api/account/delete" method="post" className="mt-3 flex flex-wrap items-end gap-2">
                  <div><label htmlFor="confirm" className="label">Typ VERWIJDER om te bevestigen</label><input id="confirm" name="confirm" required pattern="VERWIJDER" className="input" autoComplete="off" /></div>
                  <button type="submit" className="btn-danger">Account definitief verwijderen</button>
                </form>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">{canDelete === "lopende_opdracht" ? "Je hebt nog een lopende opdracht. Rond die eerst af of annuleer hem, zodat de andere partij niet in de steek wordt gelaten." : "Zeg eerst je Pro-abonnement op via Abonnement."}</p>
            )}
          </div>
        </section>

        <form action={signOut}><button type="submit" className="btn-secondary">Uitloggen</button></form>
      </div>
    </>
  );
}
