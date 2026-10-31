import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Mijn account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ wachtwoord?: string }> }) {
  const me = await requireMe("/account");
  const { wachtwoord } = await searchParams;
  const supabase = await createClient();
  const [{ data: profile }, { count: catCount }, { count: portfolioCount }, { count: jobCount }, { data: active }] = await Promise.all([
    supabase.from("profiles").select("headline, bio, place_id, avatar_path").eq("id", me.id).single(),
    supabase.from("profile_categories").select("*", { count: "exact", head: true }).eq("profile_id", me.id),
    supabase.from("portfolio_items").select("*", { count: "exact", head: true }).eq("profile_id", me.id),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("client_id", me.id).neq("status", "verwijderd"),
    supabase.from("jobs").select("id, title, status, client_id").or(`client_id.eq.${me.id},assigned_provider_id.eq.${me.id}`).in("status", ["toegewezen", "bezig", "opgeleverd", "geschil"]).limit(5),
  ]);
  const s = me.status;
  const steps = me.profile.is_provider
    ? [
        { done: !!profile?.headline && (profile?.bio ?? "").length > 80, label: "Schrijf een korte kop en beschrijving", href: "/account/profiel" },
        { done: (catCount ?? 0) > 0, label: "Kies je categorieën", href: "/account/profiel#categorieen" },
        { done: !!profile?.place_id, label: "Vul je woonplaats en reisafstand in", href: "/account/profiel" },
        { done: (portfolioCount ?? 0) > 0, label: "Voeg werk toe aan je portfolio", href: "/account/profiel#portfolio" },
        { done: !!profile?.avatar_path, label: "Upload een profielfoto", href: "/account/profiel" },
      ]
    : [{ done: (jobCount ?? 0) > 0, label: "Plaats je eerste opdracht", href: "/opdracht-plaatsen" }];

  return (
    <>
      <PageHeader title={`Hallo ${me.profile.display_name.split(" ")[0]}`} actions={<Link href="/opdracht-plaatsen" className="btn-primary">Plaats een opdracht</Link>} />
      <div className="space-y-6">
        {wachtwoord && <Notice tone="ok" title="Je wachtwoord is gewijzigd" />}
        {s.is_minor && !s.can_contract && (
          <Notice tone="warn" title="Toestemming van een ouder of voogd nodig">
            Je kunt rondkijken en je profiel invullen. Voor opdrachten plaatsen en voorstellen sturen heb je toestemming nodig. <Link className="link" href="/account/instellingen#toestemming">Toestemming vragen</Link>
          </Notice>
        )}
        {active && active.length > 0 && (
          <section className="card p-5" aria-labelledby="lopend">
            <h2 id="lopend" className="font-bold">Lopende opdrachten</h2>
            <ul className="mt-3 divide-y divide-line">
              {active.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>{j.title} <span className="text-sm text-muted">· {j.client_id === me.id ? "jij bent opdrachtgever" : "jij voert uit"}</span></span>
                  <Link href={`/account/opdrachten/${j.id}`} className="link shrink-0 text-sm">Openen</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {steps.some((x) => !x.done) && (
          <section className="card p-5" aria-labelledby="stappen">
            <h2 id="stappen" className="font-bold">{me.profile.is_provider ? "Maak je profiel sterk" : "Volgende stap"}</h2>
            {me.profile.is_provider && <p className="mt-1 text-sm text-ink-soft">Zonder beoordelingen tellen je portfolio en uitleg extra mee. Opdrachtgevers zien alleen wat je hier invult.</p>}
            <ul className="mt-3 space-y-2">
              {steps.map((st) => (
                <li key={st.label} className="flex items-center gap-2">
                  {st.done ? <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden /> : <Circle className="h-5 w-5 text-line-strong" aria-hidden />}
                  {st.done ? <span className="text-muted line-through">{st.label}</span> : <Link href={st.href} className="link">{st.label}</Link>}
                  <span className="sr-only">{st.done ? "(klaar)" : "(nog te doen)"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="grid gap-4 sm:grid-cols-3" aria-label="Snel naar">
          <Link href="/account/opdrachten" className="card p-5 hover:border-line-strong"><p className="font-semibold">Mijn opdrachten</p><p className="mt-1 text-sm text-muted">{jobCount ?? 0} geplaatst</p></Link>
          {me.profile.is_provider ? (
            <Link href="/account/voorstellen" className="card p-5 hover:border-line-strong">
              <p className="font-semibold">Mijn voorstellen</p>
              <p className="mt-1 text-sm text-muted">{s.has_pro ? `${s.proposals_this_month} deze maand · geen maandlimiet` : `${s.proposals_this_month} van ${s.proposal_limit} deze maand`}</p>
            </Link>
          ) : (
            <Link href="/account/profiel" className="card p-5 hover:border-line-strong"><p className="font-semibold">Ook als professional werken?</p><p className="mt-1 text-sm text-muted">Zet het aan in je profiel</p></Link>
          )}
          <Link href="/berichten" className="card p-5 hover:border-line-strong"><p className="font-semibold">Berichten</p><p className="mt-1 text-sm text-muted">{s.unread_messages ? `${s.unread_messages} ongelezen` : "Geen ongelezen berichten"}</p></Link>
        </section>
      </div>
    </>
  );
}
