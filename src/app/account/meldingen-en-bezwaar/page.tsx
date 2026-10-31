import Link from "next/link";
import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { PageHeader, StatusBadge } from "@/components/ui";
import { submitAppeal } from "@/actions/account";

export const metadata: Metadata = { title: "Meldingen en bezwaar" };

const statusLabel: Record<string, string> = { open: "Ontvangen", in_behandeling: "In behandeling", afgehandeld: "Afgehandeld", afgewezen: "Geen actie" };

export default async function ReportsPage() {
  const me = await requireMe("/account/meldingen-en-bezwaar");
  const supabase = await createClient();
  const [{ data: reports }, { data: decisions }] = await Promise.all([
    supabase.from("reports").select("id, target_type, reason, status, resolution, created_at, handled_at").eq("reporter_id", me.id).order("created_at", { ascending: false }),
    supabase.from("notifications").select("id, title, body, created_at").eq("user_id", me.id).in("kind", ["moderatie_besluit", "account"]).order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="Meldingen en bezwaar" intro={<>Wat er met jouw meldingen gebeurt, en besluiten over jouw inhoud. Hoe we modereren lees je in de <Link className="link" href="/communityregels#moderatie">communityregels</Link>.</>} />
      <section className="mb-10" aria-labelledby="besluiten">
        <h2 id="besluiten" className="mb-3 text-lg font-bold">Besluiten over jouw inhoud of account</h2>
        {decisions && decisions.length > 0 ? (
          <ul className="card divide-y divide-line">
            {decisions.map((d) => <li key={d.id} className="p-4"><p className="font-semibold">{d.title}</p><p className="text-sm text-ink-soft">{d.body}</p><p className="text-xs text-muted">{timeAgo(d.created_at)}</p></li>)}
          </ul>
        ) : <p className="text-ink-soft">Er zijn geen besluiten over jouw inhoud genomen.</p>}
        <div className="card mt-4 p-5">
          <h3 className="font-semibold">Bezwaar maken</h3>
          <p className="mt-1 text-sm text-ink-soft">Ben je het niet eens met een besluit? Leg uit waarom. Iemand anders dan de eerste beoordelaar bekijkt je bezwaar.</p>
          <ActionForm action={submitAppeal} hideOnSuccess className="mt-3 space-y-2">
            <label htmlFor="details" className="label">Toelichting</label>
            <textarea id="details" name="details" rows={4} minLength={20} maxLength={2000} required className="input" />
            <SubmitButton className="btn-secondary">Bezwaar indienen</SubmitButton>
          </ActionForm>
        </div>
      </section>
      <section aria-labelledby="mijn-meldingen">
        <h2 id="mijn-meldingen" className="mb-3 text-lg font-bold">Mijn meldingen</h2>
        {reports && reports.length > 0 ? (
          <ul className="card divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{r.target_type === "bezwaar" ? "Bezwaar" : `Melding over ${r.target_type}`}</span>
                  <StatusBadge label={statusLabel[r.status]} tone={r.status === "afgehandeld" ? "ok" : r.status === "open" ? "accent" : "neutral"} />
                </div>
                {r.resolution && <p className="mt-1 text-sm text-ink-soft">{r.resolution}</p>}
                <p className="text-xs text-muted">{timeAgo(r.created_at)}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-ink-soft">Je hebt nog niets gemeld.</p>}
      </section>
    </>
  );
}
