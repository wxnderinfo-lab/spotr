import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jobStatusLabel, rel } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { Avatar, Notice, StatusBadge, jobStatusTone } from "@/components/ui";
import { Chat } from "@/components/Chat";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { revokePhone, sharePhone } from "@/actions/chat";
import { blockUser } from "@/actions/engage";

export const metadata: Metadata = { title: "Gesprek", robots: { index: false, follow: false } };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireMe(`/berichten/${id}`);
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("conversations")
    .select(`id, client_id, provider_id, job:jobs(id, title, status),
      client:profiles!conversations_client_id_fkey(id, display_name, avatar_path, username),
      provider:profiles!conversations_provider_id_fkey(id, display_name, avatar_path, username)`)
    .eq("id", id)
    .maybeSingle();
  if (!c || (c.client_id !== me.id && c.provider_id !== me.id)) notFound();
  const isClient = c.client_id === me.id;
  const other = rel(isClient ? c.provider : c.client) as { id: string; display_name: string; avatar_path: string | null; username: string | null };
  const job = rel(c.job) as { id: string; title: string; status: string };

  const [{ data: messages }, { data: shares }, { data: blocked }] = await Promise.all([
    supabase.from("messages").select("id, sender_id, body, attachment_path, attachment_name, kind, created_at").eq("conversation_id", id).order("created_at").limit(200),
    supabase.from("contact_shares").select("user_id, phone, shared_at").eq("conversation_id", id).is("revoked_at", null),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", me.id).eq("blocked_id", other.id).maybeSingle(),
  ]);
  await supabase.rpc("mark_conversation_read", { p_conversation: id });
  const mine = (shares ?? []).find((s) => s.user_id === me.id);
  const theirs = (shares ?? []).find((s) => s.user_id === other.id);

  return (
    <div className="container-page grid max-w-6xl gap-6 py-6 lg:grid-cols-[1fr_20rem]">
      <section className="flex min-h-[70dvh] flex-col" aria-label={`Gesprek met ${other.display_name}`}>
        <header className="mb-3 flex items-center gap-3 border-b border-line pb-3">
          <Link href="/berichten" className="btn-ghost px-2" aria-label="Terug naar berichten"><ArrowLeft className="h-5 w-5" aria-hidden /></Link>
          <Avatar src={publicUrl("avatars", other.avatar_path)} name={other.display_name} size={40} />
          <div className="min-w-0">
            <h1 className="truncate font-bold">{other.display_name}</h1>
            <p className="truncate text-sm text-muted"><Link href={`/account/opdrachten/${job.id}`} className="hover:underline">{job.title}</Link></p>
          </div>
          <span className="ml-auto"><StatusBadge label={jobStatusLabel[job.status]} tone={jobStatusTone(job.status)} /></span>
        </header>
        {blocked ? (
          <Notice tone="warn" title={`Je hebt ${other.display_name} geblokkeerd`}>Jullie kunnen geen berichten meer sturen.</Notice>
        ) : null}
        <Chat conversationId={id} meId={me.id} initial={messages ?? []} names={{ [me.id]: "Jij", [other.id]: other.display_name }} disabled={!!blocked} />
      </section>

      <aside className="space-y-4">
        <div className="card p-5">
          <h2 className="font-bold">Opdracht</h2>
          <p className="mt-1 text-sm text-ink-soft">{job.title}</p>
          <Link href={`/account/opdrachten/${job.id}`} className="btn-secondary mt-3 w-full">Status en afronden</Link>
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Bellen</h2>
          {theirs ? (
            <>
              <p className="mt-1 text-sm text-ink-soft">{other.display_name} deelde een nummer met je.</p>
              <a href={`tel:${theirs.phone}`} className="btn-primary mt-3 w-full"><Phone className="h-4 w-4" aria-hidden /> Bel {theirs.phone.replace(/^\+31/, "0")}</a>
              <p className="mt-2 text-xs text-muted">Opent de telefoon-app van je toestel. Jobmarkt belt niet zelf en neemt niets op.</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">{other.display_name} heeft (nog) geen telefoonnummer gedeeld.</p>
          )}
          <div className="mt-4 border-t border-line pt-4">
            {mine ? (
              <>
                <p className="text-sm">Je deelt <strong>{mine.phone.replace(/^\+31/, "0")}</strong> met {other.display_name}.</p>
                <form action={revokePhone} className="mt-2">
                  <input type="hidden" name="id" value={id} />
                  <button type="submit" className="text-sm text-muted hover:text-ink hover:underline">Niet meer delen</button>
                </form>
                <p className="mt-2 text-xs text-muted">Na intrekken zie {other.display_name} je nummer niet meer op Jobmarkt. Heeft diegene het al opgeschreven of gebeld, dan kunnen we dat niet terughalen.</p>
              </>
            ) : !blocked ? (
              <ActionForm action={sharePhone} className="space-y-2">
                <input type="hidden" name="id" value={id} />
                <label htmlFor="phone" className="label">Je nummer delen (vrijwillig)</label>
                <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required className="input" placeholder="06 12345678" />
                <p className="text-xs text-muted">Alleen {other.display_name} ziet het. Je kunt het later intrekken.</p>
                <SubmitButton className="btn-secondary">Nummer delen</SubmitButton>
              </ActionForm>
            ) : null}
          </div>
        </div>
        <form action={blockUser} className="px-1">
          <input type="hidden" name="id" value={other.id} />
          <input type="hidden" name="on" value={blocked ? "0" : "1"} />
          <input type="hidden" name="pad" value={`/berichten/${id}`} />
          <button type="submit" className="text-sm text-muted hover:text-danger hover:underline">{blocked ? "Blokkade opheffen" : `${other.display_name} blokkeren`}</button>
        </form>
        <p className="px-1 text-xs text-muted">Een bericht melden? Gebruik ‘Melden’ onder het bericht. Een moderator kan dit gesprek alleen inzien zolang er een melding open staat.</p>
      </aside>
    </div>
  );
}
