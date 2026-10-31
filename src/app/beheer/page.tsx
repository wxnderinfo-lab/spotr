import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

export default async function AdminHome() {
  const supabase = await createClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [reports, moderation, disputes, verifications, outbox, jobs, pros] = await Promise.all([
    count(supabase.from("reports").select("*", { count: "exact", head: true }).in("status", ["open", "in_behandeling"])),
    count(supabase.from("jobs").select("*", { count: "exact", head: true }).eq("moderation_status", "in_beoordeling")),
    count(supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "geschil")),
    count(supabase.from("verifications").select("*", { count: "exact", head: true }).eq("status", "ingediend")),
    count(supabase.from("email_outbox").select("*", { count: "exact", head: true }).eq("status", "wachtrij")),
    count(supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open").eq("moderation_status", "ok")),
    count(supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_provider", true).eq("status", "actief")),
  ]);
  const tiles: [string, number, string][] = [
    ["Open meldingen", reports, "/beheer/meldingen"],
    ["Opdrachten te controleren", moderation, "/beheer/opdrachten"],
    ["Geschillen", disputes, "/beheer/opdrachten#geschillen"],
    ["KVK-controles", verifications, "/beheer/verificaties"],
    ["E-mails in wachtrij", outbox, "/beheer/instellingen#email"],
  ];
  return (
    <>
      <PageHeader title="Beheer" intro={`Nu ${jobs} open opdrachten en ${pros} actieve professionals (echte cijfers uit de database).`} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(([label, n, href]) => (
          <li key={label}><Link href={href} className="card block p-5 hover:border-line-strong"><p className="text-3xl font-extrabold">{n}</p><p className="text-sm text-muted">{label}</p></Link></li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-muted">Handleiding: docs/beheer.md in de repository. Elk besluit vraagt een motivering en komt in het auditlog; de betrokkene krijgt een melding met bezwaarmogelijkheid.</p>
    </>
  );
}
