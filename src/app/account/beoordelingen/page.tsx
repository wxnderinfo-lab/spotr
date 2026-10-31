import Link from "next/link";
import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatShort } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader, Stars } from "@/components/ui";
import { respondToReview } from "@/actions/jobs";

export const metadata: Metadata = { title: "Beoordelingen" };

export default async function ReviewsPage() {
  const me = await requireMe("/account/beoordelingen");
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: done }, { data: written }, { data: received }] = await Promise.all([
    supabase.from("jobs").select("id, title, completed_at").eq("status", "afgerond").gte("completed_at", since).or(`client_id.eq.${me.id},assigned_provider_id.eq.${me.id}`),
    supabase.from("reviews").select("job_id, rating, created_at").eq("reviewer_id", me.id),
    supabase.rpc("get_reviews", { p_profile: me.id, p_limit: 50, p_offset: 0 }),
  ]);
  const writtenIds = new Set((written ?? []).map((w) => w.job_id));
  const todo = (done ?? []).filter((j) => !writtenIds.has(j.id));
  return (
    <>
      <PageHeader title="Beoordelingen" intro="Beoordelingen horen altijd bij een afgeronde opdracht op Jobmarkt. Je hebt 30 dagen na afronden om te beoordelen." />
      <section className="mb-10" aria-labelledby="te-doen">
        <h2 id="te-doen" className="mb-3 text-lg font-bold">Nog te beoordelen</h2>
        {todo.length ? (
          <ul className="card divide-y divide-line">
            {todo.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 p-4">
                <span>{j.title} <span className="text-sm text-muted">· afgerond {formatShort(j.completed_at!)}</span></span>
                <Link href={`/account/opdrachten/${j.id}#beoordelen`} className="btn-secondary">Beoordelen</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft">Niets te beoordelen.</p>
        )}
      </section>
      <section aria-labelledby="ontvangen">
        <h2 id="ontvangen" className="mb-3 text-lg font-bold">Over jou (openbaar)</h2>
        {received && received.length > 0 ? (
          <ul className="space-y-4">
            {(received as { id: string; rating: number; body: string; response: string | null; job_title: string; reviewer_name: string; reviewee_role: string }[]).map((r) => (
              <li key={r.id} className="card p-5">
                <Stars value={r.rating} count={1} />
                <p className="mt-1 text-sm text-muted">{r.reviewer_name} over “{r.job_title}” · als {r.reviewee_role}</p>
                {r.body && <p className="mt-2 text-ink-soft">{r.body}</p>}
                {r.response ? (
                  <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm"><span className="font-semibold">Jouw reactie: </span>{r.response}</p>
                ) : (
                  <ActionForm action={respondToReview} hideOnSuccess className="mt-3 space-y-2">
                    <input type="hidden" name="id" value={r.id} />
                    <label htmlFor={`resp-${r.id}`} className="label">Reageer inhoudelijk (eenmalig, openbaar)</label>
                    <textarea id={`resp-${r.id}`} name="response" rows={2} maxLength={1500} className="input" />
                    <SubmitButton className="btn-secondary">Reactie plaatsen</SubmitButton>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nog geen openbare beoordelingen">Beoordelingen verschijnen zodra jullie allebei hebben beoordeeld, of uiterlijk 14 dagen na afronden.</EmptyState>
        )}
      </section>
    </>
  );
}
