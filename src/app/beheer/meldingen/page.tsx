import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { jobHref } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { handleReport } from "@/actions/admin";

export const metadata = { title: "Meldingen" };

async function targetLink(supabase: Awaited<ReturnType<typeof createClient>>, type: string, id: string): Promise<[string, string | null]> {
  if (type === "opdracht") {
    const { data } = await supabase.from("jobs").select("title, slug, code").eq("id", id).maybeSingle();
    return [data?.title ?? "Opdracht (verwijderd)", data ? jobHref(data) : null];
  }
  if (type === "profiel" || type === "bezwaar") {
    const { data } = await supabase.from("profiles").select("display_name, username").eq("id", id).maybeSingle();
    return [data?.display_name ?? "Profiel", data?.username ? `/professionals/${data.username}` : null];
  }
  if (type === "beoordeling") {
    const { data } = await supabase.from("reviews").select("body, rating").eq("id", id).maybeSingle();
    return [data ? `${data.rating}★ “${(data.body || "").slice(0, 80)}”` : "Beoordeling", null];
  }
  if (type === "bericht") {
    const { data } = await supabase.from("messages").select("body, conversation_id").eq("id", id).maybeSingle();
    return [data ? `“${data.body.slice(0, 120)}”` : "Bericht", null];
  }
  if (type === "vraag") {
    const { data } = await supabase.from("job_questions").select("question").eq("id", id).maybeSingle();
    return [data ? `“${data.question.slice(0, 120)}”` : "Vraag", null];
  }
  if (type === "dienst") {
    const { data } = await supabase.from("services").select("title, slug").eq("id", id).maybeSingle();
    return [data?.title ?? "Dienst", data ? `/diensten/${data.slug}` : null];
  }
  return [type, null];
}

export default async function AdminReports() {
  const supabase = await createClient();
  const { data: reports } = await supabase.from("reports").select("id, target_type, target_id, reason, details, status, created_at").in("status", ["open", "in_behandeling"]).order("created_at").limit(50);
  const targets = await Promise.all((reports ?? []).map((r) => targetLink(supabase, r.target_type, r.target_id)));
  return (
    <>
      <PageHeader title="Meldingen" intro="Oudste eerst. Beoordeel tegen de communityregels, motiveer je besluit; melder en betrokkene krijgen bericht." />
      {reports && reports.length > 0 ? (
        <ul className="space-y-4">
          {reports.map((r, i) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={r.target_type} tone="accent" />
                <StatusBadge label={r.reason.replace("_", " ")} />
                <span className="text-sm text-muted">{timeAgo(r.created_at)}</span>
              </div>
              <p className="mt-2 font-medium">{targets[i][1] ? <Link href={targets[i][1]!} className="link">{targets[i][0]}</Link> : targets[i][0]}</p>
              {r.details && <p className="mt-1 text-sm text-ink-soft">Toelichting melder: {r.details}</p>}
              {r.target_type === "bericht" && <p className="mt-1 text-xs text-muted">Je kunt het gesprek inzien zolang deze melding open staat.</p>}
              <ActionForm action={handleReport} className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem_12rem_auto] sm:items-end">
                <input type="hidden" name="id" value={r.id} />
                <div><label htmlFor={`res-${r.id}`} className="label">Motivering (gaat naar melder en betrokkene)</label><input id={`res-${r.id}`} name="resolution" className="input" /></div>
                <div><label htmlFor={`st-${r.id}`} className="label">Besluit</label><select id={`st-${r.id}`} name="status" className="input"><option value="afgehandeld">Afgehandeld</option><option value="afgewezen">Geen actie nodig</option><option value="in_behandeling">In behandeling</option></select></div>
                <div><label htmlFor={`ac-${r.id}`} className="label">Actie</label><select id={`ac-${r.id}`} name="action" className="input"><option value="geen">Geen</option>{r.target_type !== "profiel" && r.target_type !== "bezwaar" && <option value="verberg_inhoud">Inhoud verbergen</option>}<option value="schors_gebruiker">Gebruiker schorsen (admin)</option></select></div>
                <SubmitButton>Opslaan</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Geen open meldingen" />
      )}
    </>
  );
}
