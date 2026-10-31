import { createClient } from "@/lib/supabase/server";
import { rel, timeAgo } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader } from "@/components/ui";
import { resolveDispute, reviewJob } from "@/actions/admin";

export const metadata = { title: "Moderatie en geschillen" };

export default async function AdminJobs() {
  const supabase = await createClient();
  const [{ data: queue }, { data: disputes }] = await Promise.all([
    supabase.from("jobs").select("id, title, description, published_at, client:profiles!jobs_client_id_fkey(display_name)").eq("moderation_status", "in_beoordeling").order("published_at"),
    supabase.from("jobs").select("id, title, updated_at, history:job_status_history(to_status, note, created_at)").eq("status", "geschil").order("updated_at"),
  ]);
  return (
    <>
      <PageHeader title="Moderatie en geschillen" />
      <section aria-labelledby="wachtrij" className="mb-12">
        <h2 id="wachtrij" className="mb-3 text-lg font-bold">Opdrachten te controleren</h2>
        <p className="mb-4 text-sm text-muted">Automatisch tegengehouden door een link, contactgegevens of een signaalwoord. Keur goed als het past binnen de communityregels.</p>
        {queue && queue.length > 0 ? (
          <ul className="space-y-4">
            {queue.map((j) => (
              <li key={j.id} className="card p-5">
                <p className="font-semibold">{j.title}</p>
                <p className="text-sm text-muted">{(rel(j.client) as { display_name: string } | null)?.display_name} · {j.published_at ? timeAgo(j.published_at) : ""}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{j.description}</p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <ActionForm action={reviewJob}>
                    <input type="hidden" name="id" value={j.id} /><input type="hidden" name="approve" value="1" />
                    <SubmitButton>Goedkeuren</SubmitButton>
                  </ActionForm>
                  <ActionForm action={reviewJob} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={j.id} /><input type="hidden" name="approve" value="0" />
                    <div><label htmlFor={`rj-${j.id}`} className="label">Reden afwijzing</label><input id={`rj-${j.id}`} name="reason" className="input" placeholder="Bijv. contactgegevens in de tekst" /></div>
                    <SubmitButton className="btn-danger">Afwijzen</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="Niets te controleren" />}
      </section>
      <section id="geschillen" aria-labelledby="geschil-titel">
        <h2 id="geschil-titel" className="mb-3 text-lg font-bold">Geschillen</h2>
        {disputes && disputes.length > 0 ? (
          <ul className="space-y-4">
            {disputes.map((d) => {
              const last = ((d.history ?? []) as { to_status: string; note: string | null; created_at: string }[]).filter((h) => h.to_status === "geschil").pop();
              return (
                <li key={d.id} className="card p-5">
                  <p className="font-semibold">{d.title}</p>
                  {last?.note && <p className="mt-1 text-sm text-ink-soft">Gemeld: {last.note}</p>}
                  <ActionForm action={resolveDispute} className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                    <input type="hidden" name="id" value={d.id} />
                    <div><label htmlFor={`dn-${d.id}`} className="label">Besluit en motivering</label><input id={`dn-${d.id}`} name="note" className="input" /></div>
                    <div><label htmlFor={`dt-${d.id}`} className="label">Nieuwe status</label><select id={`dt-${d.id}`} name="to" className="input"><option value="afgerond">Afgerond</option><option value="bezig">Terug naar bezig</option><option value="geannuleerd">Geannuleerd</option></select></div>
                    <SubmitButton>Afsluiten</SubmitButton>
                  </ActionForm>
                  <p className="mt-2 text-xs text-muted">Jobmarkt houdt geen geld vast en kan geen betalingen terugdraaien. Het besluit gaat over de status en eventuele beoordelingen.</p>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState title="Geen geschillen" />}
      </section>
    </>
  );
}
