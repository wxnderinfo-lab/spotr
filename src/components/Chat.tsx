"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CheckCheck, Paperclip, Send, FileText } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { attachmentUrl } from "@/actions/chat";
import { formatTime, formatShort, lastSeenLabel } from "@/lib/format";
import { prepareImage } from "@/lib/image";
import { Avatar, StatusBadge } from "./ui";
import { ReportButton } from "./ReportButton";

type Msg = { id: string; sender_id: string | null; body: string; attachment_path: string | null; attachment_name: string | null; kind: string; created_at: string };
type Peer = { id: string; name: string; avatarUrl: string | null };
type Tone = "neutral" | "ok" | "warn" | "danger" | "accent";

const MAX_PDF = 10 * 1024 * 1024;
const TYPING_SHOWN_MS = 4000;
const TYPING_SEND_EVERY_MS = 2500;

export function Chat({ conversationId, meId, initial, peer, job, disabled }: {
  conversationId: string; meId: string; initial: Msg[]; peer: Peer;
  job: { id: string; title: string; statusLabel: string; tone: Tone }; disabled?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  // status van de ander: hier aanwezig, typt, laatst actief, gelezen tot
  const [peerHere, setPeerHere] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerSeen, setPeerSeen] = useState<string | null>(null);
  const [peerRead, setPeerRead] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<RealtimeChannel | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const supabase = createClient();

  const merge = (incoming: Msg[]) =>
    setMessages((cur) => {
      const ids = new Set(cur.map((m) => m.id));
      const add = incoming.filter((m) => !ids.has(m.id));
      return add.length ? [...cur, ...add].sort((a, b) => a.created_at.localeCompare(b.created_at)) : cur;
    });

  // alleen als gelezen markeren als je het gesprek ook echt ziet
  // (een Supabase-verzoek gaat pas de deur uit bij then/await)
  const markRead = () => {
    if (document.visibilityState === "visible") supabase.rpc("mark_conversation_read", { p_conversation: conversationId }).then(() => {});
  };

  const loadPeer = async () => {
    const { data } = await supabase.rpc("conversation_peer", { p_conversation: conversationId });
    if (data) {
      setPeerSeen((data as { last_seen_at: string | null }).last_seen_at);
      setPeerRead((data as { last_read_at: string | null }).last_read_at);
    }
  };

  // Realtime voor berichten en leesbevestiging; zonder Realtime elke 5 seconden ophalen.
  useEffect(() => {
    const channel = supabase
      .channel(`gesprek-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload: { new: unknown }) => {
        const m = payload.new as Msg;
        merge([m]);
        if (m.sender_id === peer.id) setPeerTyping(false);
        markRead();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_reads", filter: `conversation_id=eq.${conversationId}` }, (payload: { new: { user_id?: string; last_read_at?: string } }) => {
        if (payload.new?.user_id === peer.id && payload.new.last_read_at) setPeerRead(payload.new.last_read_at);
      })
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Privé kanaal voor typen en aanwezigheid (alleen de twee deelnemers, zie migratie).
  useEffect(() => {
    if (disabled) return;
    const room = supabase.channel(`gesprek:${conversationId}`, { config: { private: true, presence: { key: meId } } });
    room
      .on("presence", { event: "sync" }, () => {
        const here = Object.keys(room.presenceState()).includes(peer.id);
        setPeerHere(here);
        if (here) setPeerSeen(new Date().toISOString());
      })
      .on("broadcast", { event: "typen" }, (p: { payload?: { user?: string; typing?: boolean } }) => {
        if (p.payload?.user !== peer.id) return;
        if (typingTimer.current) clearTimeout(typingTimer.current);
        setPeerTyping(!!p.payload.typing);
        if (p.payload.typing) typingTimer.current = setTimeout(() => setPeerTyping(false), TYPING_SHOWN_MS);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") await room.track({ at: new Date().toISOString() });
      });
    roomRef.current = room;
    return () => {
      roomRef.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      supabase.removeChannel(room);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, disabled]);

  const sendTyping = (typing: boolean) => {
    const now = Date.now();
    if (typing && now - lastTypingSent.current < TYPING_SEND_EVERY_MS) return;
    lastTypingSent.current = typing ? now : 0;
    roomRef.current?.send({ type: "broadcast", event: "typen", payload: { user: meId, typing } });
  };

  // status van de ander bij openen, regelmatig, en als je terugkomt in het tabblad
  useEffect(() => {
    loadPeer();
    const t = setInterval(() => {
      loadPeer();
      setTick((n) => n + 1); // 'laatst actief 3 min geleden' bijwerken
    }, live ? 30_000 : 10_000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        markRead();
        loadPeer();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, live]);

  useEffect(() => {
    if (live) return;
    const t = setInterval(async () => {
      const last = messages[messages.length - 1]?.created_at ?? "1970-01-01";
      const { data } = await supabase.from("messages").select("id, sender_id, body, attachment_path, attachment_name, kind, created_at").eq("conversation_id", conversationId).gt("created_at", last).order("created_at");
      if (data?.length) {
        merge(data);
        markRead();
      }
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, messages, conversationId]);

  // accolades: scrollIntoView geeft in nieuwere browsers een Promise terug,
  // en een effect mag alleen een opruimfunctie teruggeven
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(body: string, attachment?: { path: string; name: string }) {
    setSending(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, body, attachment_path: attachment?.path ?? null, attachment_name: attachment?.name ?? null })
      .select("id, sender_id, body, attachment_path, attachment_name, kind, created_at")
      .single();
    setSending(false);
    if (err) {
      setError(err.message.includes("te_veel") ? "Je stuurt veel berichten achter elkaar. Wacht even." : err.message.includes("geblokkeerd") ? "Dit gesprek is geblokkeerd." : "Versturen lukte niet. Probeer het opnieuw.");
      return false;
    }
    merge([data]);
    sendTyping(false);
    return true;
  }

  async function upload(file: File) {
    setError(null);
    try {
      let blob: Blob = file;
      let name = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120);
      let type = file.type;
      if (file.type.startsWith("image/")) {
        blob = await prepareImage(file, 2000);
        type = "image/webp";
        name = name.replace(/\.[^.]+$/, "") + ".webp";
      } else if (file.type !== "application/pdf") {
        throw new Error("Alleen foto's (JPG, PNG, WebP) en pdf-bestanden.");
      } else if (file.size > MAX_PDF) {
        throw new Error("Pdf-bestanden mogen maximaal 10 MB zijn.");
      }
      setSending(true);
      const path = `${conversationId}/${crypto.randomUUID()}-${name}`;
      const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, blob, { contentType: type });
      setSending(false);
      if (upErr) throw new Error("Uploaden lukte niet.");
      await send("", { path, name });
    } catch (e) {
      setSending(false);
      setError((e as Error).message);
    }
  }

  async function open(path: string) {
    const url = await attachmentUrl(path);
    if (url) window.open(url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${url}`, "_blank", "noopener");
    else setError("Bijlage openen lukte niet.");
  }

  const isRead = (m: Msg) => !!peerRead && peerRead >= m.created_at;
  const lastMine = [...messages].reverse().find((m) => m.sender_id === meId && m.kind === "bericht");
  const status = disabled ? null : peerTyping ? "typt…" : peerHere ? "Online" : lastSeenLabel(peerSeen);

  let lastDay = "";
  return (
    <>
      <header className="mb-3 flex items-center gap-3 border-b border-line pb-3">
        <Link href="/berichten" className="btn-ghost px-2" aria-label="Terug naar berichten"><ArrowLeft className="h-5 w-5" aria-hidden /></Link>
        <span className="relative shrink-0">
          <Avatar src={peer.avatarUrl} name={peer.name} size={40} />
          {status === "Online" || status === "typt…" ? (
            <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-paper bg-ok" aria-hidden />
          ) : null}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-bold">{peer.name}</h1>
          <p className="truncate text-sm text-muted">
            {status ? (
              <span className={status === "typt…" || status === "Online" ? "font-medium text-ok" : ""} aria-live="polite">{status}</span>
            ) : null}
            {status ? " · " : ""}
            <Link href={`/account/opdrachten/${job.id}`} className="hover:underline">{job.title}</Link>
          </p>
        </div>
        <span className="ml-auto"><StatusBadge label={job.statusLabel} tone={job.tone} /></span>
      </header>
    <div className="flex flex-1 flex-col">
      <ol className="flex-1 space-y-2 overflow-y-auto pb-4" aria-live="polite" aria-relevant="additions">
        {messages.map((m) => {
          const day = formatShort(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.sender_id === meId;
          const read = mine && isRead(m);
          return (
            <li key={m.id}>
              {showDay && <p className="my-3 text-center text-xs text-muted">{day}</p>}
              {m.kind === "systeem" ? (
                <p className="mx-auto max-w-md rounded-lg bg-sunken px-3 py-2 text-center text-sm text-ink-soft">{m.body}</p>
              ) : (
                <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? "bg-ink text-paper" : "border border-line bg-surface"}`}>
                    <span className="sr-only">{mine ? "Jij" : m.sender_id === peer.id ? peer.name : "Verwijderd account"}: </span>
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    {m.attachment_path && (
                      <button type="button" onClick={() => open(m.attachment_path!)} className={`mt-1 inline-flex items-center gap-1.5 text-sm underline ${mine ? "text-paper" : "text-accent"}`}>
                        <FileText className="h-4 w-4" aria-hidden /> {m.attachment_name ?? "Bijlage"}
                      </button>
                    )}
                    <p className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? "text-paper/70" : "text-muted"}`}>
                      {formatTime(m.created_at)}
                      {mine && (read
                        ? <CheckCheck className="h-3.5 w-3.5 text-accent-soft" aria-label="Gelezen" />
                        : <Check className="h-3.5 w-3.5" aria-label="Verzonden" />)}
                    </p>
                  </div>
                  {mine && m.id === lastMine?.id && (
                    <p className="mt-1 text-xs text-muted">{read ? `Gelezen${peerRead ? ` ${formatTime(peerRead)}` : ""}` : "Verzonden"}</p>
                  )}
                  {!mine && <div className="mt-1"><ReportButton targetType="bericht" targetId={m.id} /></div>}
                </div>
              )}
            </li>
          );
        })}
        {peerTyping && (
          <li className="flex items-start" aria-label={`${peer.name} typt`}>
            <span className="inline-flex items-center gap-1 rounded-2xl border border-line bg-surface px-4 py-3" aria-hidden>
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-soft" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-soft" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-soft" />
            </span>
          </li>
        )}
        <div ref={endRef} />
      </ol>
      {error && <p role="alert" className="mb-2 rounded-lg bg-danger-soft px-3 py-2 text-sm">{error}</p>}
      {!disabled && (
        <form
          className="sticky bottom-0 flex items-end gap-2 border-t border-line bg-paper pt-3 pb-[env(safe-area-inset-bottom)]"
          onSubmit={async (e) => {
            e.preventDefault();
            const body = text.trim();
            if (!body) return;
            if (await send(body)) setText("");
          }}
        >
          <label className="btn-ghost cursor-pointer px-3" title="Foto of pdf toevoegen">
            <Paperclip className="h-5 w-5" aria-hidden />
            <span className="sr-only">Foto of pdf toevoegen</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
          </label>
          <label htmlFor="bericht" className="sr-only">Bericht</label>
          <textarea
            id="bericht"
            rows={1}
            value={text}
            maxLength={4000}
            onChange={(e) => {
              setText(e.target.value);
              sendTyping(e.target.value.trim().length > 0);
            }}
            onBlur={() => sendTyping(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
            className="input max-h-40 min-h-11 flex-1 resize-y"
            placeholder="Typ een bericht"
          />
          <button type="submit" className="btn-primary px-3" disabled={sending || !text.trim()} aria-label="Versturen">
            <Send className="h-5 w-5" aria-hidden />
          </button>
        </form>
      )}
      {!live && <p className="mt-1 text-xs text-muted">Nieuwe berichten worden elke paar seconden opgehaald.</p>}
    </div>
    </>
  );
}
