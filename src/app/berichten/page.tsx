import Link from "next/link";
import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rel, timeAgo } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Berichten", robots: { index: false, follow: false } };

export default async function ConversationsPage() {
  const me = await requireMe("/berichten");
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(`id, client_id, provider_id, last_message_at,
      job:jobs(title, status),
      client:profiles!conversations_client_id_fkey(display_name, avatar_path),
      provider:profiles!conversations_provider_id_fkey(display_name, avatar_path),
      reads:conversation_reads(user_id, last_read_at)`)
    .or(`client_id.eq.${me.id},provider_id.eq.${me.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader title="Berichten" intro="Een privégesprek opent zodra een voorstel is geaccepteerd. Alleen jullie tweeën kunnen het lezen." />
      {data && data.length > 0 ? (
        <ul className="card divide-y divide-line">
          {data.map((c) => {
            const other = rel(c.client_id === me.id ? c.provider : c.client) as { display_name: string; avatar_path: string | null } | null;
            const job = rel(c.job) as { title: string; status: string } | null;
            const read = ((c.reads ?? []) as { user_id: string; last_read_at: string }[]).find((r) => r.user_id === me.id);
            const unread = c.last_message_at && (!read || new Date(read.last_read_at) < new Date(c.last_message_at));
            return (
              <li key={c.id}>
                <Link href={`/berichten/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-sunken">
                  <Avatar src={publicUrl("avatars", other?.avatar_path)} name={other?.display_name ?? ""} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>{other?.display_name}{unread && <span className="sr-only"> (ongelezen)</span>}</p>
                    <p className="truncate text-sm text-muted">{job?.title}</p>
                  </div>
                  {c.last_message_at && <span className="shrink-0 text-xs text-muted">{timeAgo(c.last_message_at)}</span>}
                  {unread && <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Nog geen gesprekken" action={<Link href="/opdracht-plaatsen" className="btn-primary">Plaats een opdracht</Link>}>
          Vóór je keuze stel je vragen openbaar bij de opdracht, zonder contactgegevens. Na acceptatie praat je hier verder.
        </EmptyState>
      )}
    </div>
  );
}
