import Link from "next/link";
import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jobHref } from "@/lib/data";
import { euro, proposalStatusLabel, rel, timeAgo } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { withdrawProposal } from "@/actions/jobs";

export const metadata: Metadata = { title: "Mijn voorstellen" };

export default async function MyProposalsPage() {
  const me = await requireMe("/account/voorstellen");
  const supabase = await createClient();
  const { data } = await supabase
    .from("proposals")
    .select("id, status, amount_cents, price_type, created_at, job:jobs(id, code, slug, title, status)")
    .eq("provider_id", me.id)
    .order("created_at", { ascending: false });
  const s = me.status;
  return (
    <>
      <PageHeader
        title="Mijn voorstellen"
        intro={s.has_pro ? `Deze maand ${s.proposals_this_month} verstuurd. ${s.intro_period ? "Tijdens de introductieperiode heb je Pro-rechten." : "Je hebt Pro: geen maandlimiet."}` : `Deze maand ${s.proposals_this_month} van ${s.proposal_limit} gratis voorstellen gebruikt. Ingetrokken voorstellen tellen mee.`}
        actions={<Link href="/opdrachten" className="btn-primary">Opdrachten zoeken</Link>}
      />
      {data && data.length > 0 ? (
        <ul className="card divide-y divide-line">
          {data.map((p) => {
            const job = rel(p.job) as { id: string; code: string; slug: string; title: string; status: string } | null;
            return (
              <li key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {job && <Link href={p.status === "geaccepteerd" ? `/account/opdrachten/${job.id}` : jobHref(job)} className="font-semibold hover:underline">{job.title}</Link>}
                  <p className="text-sm text-muted">{euro(p.amount_cents)}{p.price_type === "uur" ? " per uur" : ""} · verstuurd {timeAgo(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge label={proposalStatusLabel[p.status]} tone={p.status === "geaccepteerd" ? "ok" : p.status === "verstuurd" ? "accent" : "neutral"} />
                  {p.status === "verstuurd" && (
                    <form action={withdrawProposal}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-sm text-muted hover:text-ink hover:underline">Intrekken</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Nog geen voorstellen verstuurd" action={<Link href="/opdrachten" className="btn-primary">Bekijk open opdrachten</Link>}>
          Kies een opdracht die bij je past en vertel kort wat je gaat doen, wat het kost en wanneer je kunt.
        </EmptyState>
      )}
    </>
  );
}
