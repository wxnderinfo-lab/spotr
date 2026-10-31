import Link from "next/link";
import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jobStatusLabel, timeAgo, rel } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge, jobStatusTone } from "@/components/ui";

export const metadata: Metadata = { title: "Mijn opdrachten" };

export default async function MyJobsPage() {
  const me = await requireMe("/account/opdrachten");
  const supabase = await createClient();
  const [{ data: mine }, { data: doing }] = await Promise.all([
    supabase.from("jobs").select("id, title, status, moderation_status, proposal_count, created_at, published_at").eq("client_id", me.id).neq("status", "verwijderd").order("created_at", { ascending: false }),
    supabase.from("jobs").select("id, title, status, created_at, client:profiles!jobs_client_id_fkey(display_name)").eq("assigned_provider_id", me.id).order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="Mijn opdrachten" actions={<Link href="/opdracht-plaatsen" className="btn-primary">Nieuwe opdracht</Link>} />
      <section aria-labelledby="geplaatst">
        <h2 id="geplaatst" className="mb-3 text-lg font-bold">Door mij geplaatst</h2>
        {mine && mine.length > 0 ? (
          <ul className="card divide-y divide-line">
            {mine.map((j) => (
              <li key={j.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/account/opdrachten/${j.id}`} className="font-semibold hover:underline">{j.title}</Link>
                  <p className="text-sm text-muted">{j.published_at ? `Geplaatst ${timeAgo(j.published_at)}` : `Aangemaakt ${timeAgo(j.created_at)}`} · {j.proposal_count} voorstel{j.proposal_count === 1 ? "" : "len"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {j.moderation_status !== "ok" && <StatusBadge label={j.moderation_status === "in_beoordeling" ? "Wordt gecontroleerd" : "Niet gepubliceerd"} tone="warn" />}
                  <StatusBadge label={jobStatusLabel[j.status]} tone={jobStatusTone(j.status)} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Je hebt nog geen opdrachten geplaatst" action={<Link href="/opdracht-plaatsen" className="btn-primary">Plaats een opdracht</Link>}>
            Beschrijf wat je wilt laten doen. Plaatsen en voorstellen ontvangen is gratis.
          </EmptyState>
        )}
      </section>
      {doing && doing.length > 0 && (
        <section className="mt-10" aria-labelledby="uitvoeren">
          <h2 id="uitvoeren" className="mb-3 text-lg font-bold">Die ik uitvoer</h2>
          <ul className="card divide-y divide-line">
            {doing.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/account/opdrachten/${j.id}`} className="font-semibold hover:underline">{j.title}</Link>
                  <p className="text-sm text-muted">Voor {(rel(j.client) as { display_name: string } | null)?.display_name}</p>
                </div>
                <StatusBadge label={jobStatusLabel[j.status]} tone={jobStatusTone(j.status)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
