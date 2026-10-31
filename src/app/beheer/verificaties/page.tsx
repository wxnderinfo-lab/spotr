import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rel, timeAgo } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader } from "@/components/ui";
import { reviewVerification } from "@/actions/admin";

export const metadata = { title: "KVK-controles" };

export default async function AdminVerifications() {
  const me = await getMe();
  if (!me?.status.is_admin) redirect("/beheer");
  const supabase = await createClient();
  const { data } = await supabase.from("verifications").select("id, reference, created_at, profile:profiles(display_name, company_name, username)").eq("status", "ingediend").order("created_at");
  return (
    <>
      <PageHeader title="KVK-controles" intro={<>Zoek het nummer op in het <a className="link" href="https://www.kvk.nl/zoeken/" rel="noopener noreferrer" target="_blank">KVK Handelsregister</a> en vergelijk naam en activiteit. Keur alleen goed als het klopt.</>} />
      {data && data.length ? (
        <ul className="space-y-3">
          {data.map((v) => {
            const p = rel(v.profile) as { display_name: string; company_name: string | null; username: string } | null;
            return (
              <li key={v.id} className="card p-4">
                <p className="font-semibold">KVK {v.reference}</p>
                <p className="text-sm text-muted">{p?.display_name}{p?.company_name ? ` · ${p.company_name}` : ""} · {timeAgo(v.created_at)}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <ActionForm action={reviewVerification} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={v.id} /><input type="hidden" name="approve" value="1" />
                    <SubmitButton>Klopt, goedkeuren</SubmitButton>
                  </ActionForm>
                  <ActionForm action={reviewVerification} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={v.id} /><input type="hidden" name="approve" value="0" />
                    <div><label htmlFor={`n-${v.id}`} className="label">Reden</label><input id={`n-${v.id}`} name="note" className="input" /></div>
                    <SubmitButton className="btn-danger">Afwijzen</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState title="Geen aanvragen" />}
    </>
  );
}
