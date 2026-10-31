import Link from "next/link";
import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { billingEnabled, isTestMode } from "@/lib/billing";
import { plans, priceExVat } from "@/config/pricing";
import { euro, formatDate } from "@/lib/format";
import { Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Abonnement" };

const errors: Record<string, string> = {
  niet_actief: "Betalen is nog niet geopend. Je houdt gewoon je gratis account.",
  minderjarig: "Pro is beschikbaar vanaf 18 jaar.",
  al_pro: "Je hebt al Pro.",
  geen_klant: "We vonden geen betaalgegevens bij je account.",
};

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ fout?: string; gelukt?: string; geannuleerd?: string }> }) {
  const me = await requireMe("/account/abonnement");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("status, current_period_end, cancel_at_period_end").eq("user_id", me.id).maybeSingle();
  const { data: intro } = await supabase.from("app_settings").select("value").eq("key", "intro_period_until").maybeSingle();
  const s = me.status;
  const enabled = billingEnabled();
  return (
    <>
      <PageHeader title="Abonnement" intro="Opdrachten plaatsen is altijd gratis. Pro is voor professionals die vaker reageren." />
      <div className="space-y-6">
        {sp.fout && <Notice tone="warn" title={errors[sp.fout] ?? "Dat lukte niet."} />}
        {sp.gelukt && <Notice tone="ok" title="Bedankt! Je betaling wordt verwerkt">Pro is actief zodra Stripe de betaling bevestigt, meestal binnen een minuut.</Notice>}
        {sp.geannuleerd && <Notice tone="info" title="Je hebt niet afgerekend">Er is niets afgeschreven.</Notice>}

        <section className="card p-5 sm:p-6" aria-labelledby="huidig">
          <h2 id="huidig" className="text-lg font-bold">Je huidige situatie</h2>
          {s.has_paid_pro && sub ? (
            <p className="mt-2">Je hebt <strong>Jobmarkt Pro</strong>. {sub.cancel_at_period_end ? `Opgezegd: Pro loopt af op ${sub.current_period_end ? formatDate(sub.current_period_end) : "het einde van de periode"}.` : `Volgende verlenging: ${sub.current_period_end ? formatDate(sub.current_period_end) : "-"}.`}</p>
          ) : s.intro_period ? (
            <p className="mt-2">Tijdens de introductieperiode (tot en met {formatDate(String(intro?.value))}) heeft iedereen gratis Pro-rechten. Je hoeft niets te doen; er wordt niets afgeschreven.</p>
          ) : (
            <p className="mt-2">Je hebt het <strong>gratis</strong> account: {s.proposals_this_month} van {s.proposal_limit} voorstellen gebruikt deze maand.</p>
          )}
          {s.has_paid_pro && enabled && (
            <form action="/api/billing/portal" method="post" className="mt-4">
              <button type="submit" className="btn-secondary">Opzeggen, facturen of betaalmethode</button>
            </form>
          )}
        </section>

        {!s.has_paid_pro && (
          <section className="card p-5 sm:p-6" aria-labelledby="pro">
            <h2 id="pro" className="text-lg font-bold">{plans.pro.name}</h2>
            <p className="mt-1"><span className="text-3xl font-extrabold">{euro(plans.pro.priceCents, true)}</span> per maand <span className="text-sm text-muted">incl. 21% btw ({euro(priceExVat(plans.pro.priceCents), true)} excl. btw)</span></p>
            <p className="mt-1 text-sm text-muted">Maandelijks, automatisch verlengd, op elk moment op te zeggen. Na opzeggen houd je Pro tot het einde van de betaalde maand. Geen jaarcontract.</p>
            <ul className="mt-4 space-y-1.5 text-sm">{plans.pro.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{f}</li>)}</ul>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">{plans.pro.notIncluded.map((f) => <li key={f} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{f}</li>)}</ul>
            <div className="mt-5">
              {s.is_minor ? (
                <Notice tone="info" title="Pro is beschikbaar vanaf 18 jaar">Tot die tijd gebruik je Jobmarkt gratis.</Notice>
              ) : !enabled ? (
                <Notice tone="info" title="Betalen is nog niet geopend">
                  We starten bewust zonder betaald abonnement, tot er genoeg opdrachten zijn om het waard te maken. {s.intro_period ? "Tijdens de introductieperiode heb je de Pro-rechten gratis." : ""}
                </Notice>
              ) : (
                <form action="/api/billing/checkout" method="post">
                  {isTestMode() && <p className="mb-2 text-sm font-semibold text-warn">Testmodus: er wordt niets echt afgeschreven.</p>}
                  <button type="submit" className="btn-primary">Verder naar betalen</button>
                  <p className="mt-2 text-xs text-muted">Je betaalt via Stripe. Door verder te gaan ga je akkoord met de <Link className="link" href="/voorwaarden#abonnement">abonnementsvoorwaarden</Link>. Als consument heb je 14 dagen bedenktijd; gebruik je Pro in die periode al, dan betaal je naar rato voor de dagen dat je het had.</p>
                </form>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
