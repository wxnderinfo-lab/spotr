import Link from "next/link";
import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { plans, priceExVat, antiSpam } from "@/config/pricing";
import { euro } from "@/lib/format";
import { createPublicClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Prijzen: gratis plaatsen, Pro voor professionals",
  description: `Opdrachten plaatsen is gratis. Professionals sturen gratis ${plans.gratis.proposalsPerMonth} voorstellen per maand, of onbeperkt met Pro voor ${euro(plans.pro.priceCents, true)} per maand. Geen kosten per contact.`,
  alternates: { canonical: "/prijzen" },
};

export default async function PricingPage() {
  const { data: intro } = await createPublicClient().from("app_settings").select("value").eq("key", "intro_period_until").maybeSingle();
  const introUntil = typeof intro?.value === "string" ? intro.value : null;
  const billingOpen = process.env.BILLING_ENABLED === "true";
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: "Prijzen" }]} />
      <PageHeader title="Prijzen" intro="Geen kosten per contact, geen verborgen kosten. Opdrachtgevers betalen niets aan Jobmarkt." />
      {introUntil && <p className="mb-6 rounded-xl bg-accent-soft px-4 py-3 text-sm">Introductieperiode: tot en met {introUntil} heeft iedereen de Pro-rechten gratis.</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6" aria-labelledby="og">
          <p className="eyebrow">Opdrachtgevers</p>
          <h2 id="og" className="mt-1 text-xl font-bold">Altijd gratis</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {["Opdrachten plaatsen", "Voorstellen ontvangen en vergelijken", "Een professional kiezen en chatten", "Geen kosten per contact of per keuze"].map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{f}</li>)}
          </ul>
          <Link href="/opdracht-plaatsen" className="btn-primary mt-6 w-full">Plaats een opdracht</Link>
        </section>
        <section className="card p-6" aria-labelledby="gratis">
          <p className="eyebrow">Professionals</p>
          <h2 id="gratis" className="mt-1 text-xl font-bold">{plans.gratis.name}</h2>
          <p className="mt-2"><span className="text-3xl font-extrabold">€ 0</span></p>
          <ul className="mt-4 space-y-2 text-sm">{plans.gratis.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{f}</li>)}</ul>
          <Link href="/aanmelden?rol=professional" className="btn-secondary mt-6 w-full">Gratis profiel maken</Link>
        </section>
        <section className="card border-ink p-6" aria-labelledby="pro">
          <p className="eyebrow">Professionals</p>
          <h2 id="pro" className="mt-1 text-xl font-bold">{plans.pro.name}</h2>
          <p className="mt-2"><span className="text-3xl font-extrabold">{euro(plans.pro.priceCents, true)}</span> <span className="text-muted">per maand</span></p>
          <p className="text-sm text-muted">Incl. 21% btw ({euro(priceExVat(plans.pro.priceCents), true)} excl. btw). Maandelijks opzegbaar.</p>
          <ul className="mt-4 space-y-2 text-sm">{plans.pro.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{f}</li>)}</ul>
          <ul className="mt-3 space-y-2 text-sm text-muted">{plans.pro.notIncluded.map((f) => <li key={f} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{f}</li>)}</ul>
          <Link href="/account/abonnement" className="btn-primary mt-6 w-full">{billingOpen ? "Pro kiezen" : "Bekijk in je account"}</Link>
          {!billingOpen && <p className="mt-2 text-center text-xs text-muted">Betalen is nog niet geopend.</p>}
        </section>
      </div>
      <section className="prose-jm mt-12 max-w-3xl" aria-labelledby="details">
        <h2 id="details">Goed om te weten</h2>
        <ul>
          <li>De maandlimiet telt nieuwe voorstellen per kalendermaand (Nederlandse tijd). Ingetrokken voorstellen tellen mee, zodat de limiet niet te omzeilen is.</li>
          <li>Voor iedereen, ook Pro, geldt een maximum van {antiSpam.proposalsPerDay} voorstellen per dag en {antiSpam.maxProposalsPerJob} voorstellen per opdracht. Zo houden opdrachtgevers overzicht.</li>
          <li>Je kunt alleen reageren op opdrachten in de categorieën van je profiel.</li>
          <li>Pro verlengt automatisch per maand. Opzeggen doe je zelf in je account; je houdt Pro tot het einde van de betaalde maand. Er is geen jaarabonnement.</li>
          <li>Pro is beschikbaar vanaf 18 jaar.</li>
          <li>Jobmarkt verwerkt alleen het abonnementsgeld. Het geld voor een opdracht regelen jullie samen.</li>
        </ul>
      </section>
    </div>
  );
}
