import Link from "next/link";
import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { markAllNotificationsRead } from "@/actions/account";

export const metadata: Metadata = { title: "Meldingen" };

export default async function NotificationsPage() {
  const me = await requireMe("/account/meldingen");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, kind, title, body, link, read_at, created_at").eq("user_id", me.id).order("created_at", { ascending: false }).limit(100);
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <>
      <PageHeader
        title="Meldingen"
        actions={unread > 0 ? (
          <form action={markAllNotificationsRead}><button type="submit" className="btn-secondary">Alles als gelezen markeren</button></form>
        ) : undefined}
      />
      {data && data.length > 0 ? (
        <ul className="card divide-y divide-line">
          {data.map((n) => (
            <li key={n.id} className={`flex gap-3 p-4 ${n.read_at ? "" : "bg-accent-soft/40"}`}>
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-accent"}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}{!n.read_at && <span className="sr-only"> (nieuw)</span>}</p>
                {n.body && <p className="text-sm text-ink-soft">{n.body}</p>}
                <p className="mt-0.5 text-xs text-muted">{timeAgo(n.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Geen meldingen">Je krijgt hier een melding bij nieuwe voorstellen, vragen, berichten en statuswijzigingen.</EmptyState>
      )}
    </>
  );
}
