"use client";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { attachmentUrl } from "@/actions/chat";
import { formatTime, formatShort } from "@/lib/format";
import { prepareImage } from "@/lib/image";
import { ReportButton } from "./ReportButton";

type Msg = { id: string; sender_id: string | null; body: string; attachment_path: string | null; attachment_name: string | null; kind: string; created_at: string };

const MAX_PDF = 10 * 1024 * 1024;

export function Chat({ conversationId, meId, initial, names, disabled }: {
  conversationId: string; meId: string; initial: Msg[]; names: Record<string, string>; disabled?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const merge = (incoming: Msg[]) =>
    setMessages((cur) => {
      const ids = new Set(cur.map((m) => m.id));
      const add = incoming.filter((m) => !ids.has(m.id));
      return add.length ? [...cur, ...add].sort((a, b) => a.created_at.localeCompare(b.created_at)) : cur;
    });

  // Realtime; als dat niet beschikbaar is, elke 5 seconden ophalen.
  useEffect(() => {
    const channel = supabase
      .channel(`gesprek-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload: { new: unknown }) => {
        merge([payload.new as Msg]);
        supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
      })
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (live) return;
    const t = setInterval(async () => {
      const last = messages[messages.length - 1]?.created_at ?? "1970-01-01";
      const { data } = await supabase.from("messages").select("id, sender_id, body, attachment_path, attachment_name, kind, created_at").eq("conversation_id", conversationId).gt("created_at", last).order("created_at");
      if (data?.length) {
        merge(data);
        supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
      }
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, messages, conversationId]);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [messages.length]);

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

  let lastDay = "";
  return (
    <div className="flex flex-1 flex-col">
      <ol className="flex-1 space-y-2 overflow-y-auto pb-4" aria-live="polite" aria-relevant="additions">
        {messages.map((m) => {
          const day = formatShort(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.sender_id === meId;
          return (
            <li key={m.id}>
              {showDay && <p className="my-3 text-center text-xs text-muted">{day}</p>}
              {m.kind === "systeem" ? (
                <p className="mx-auto max-w-md rounded-lg bg-sunken px-3 py-2 text-center text-sm text-ink-soft">{m.body}</p>
              ) : (
                <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? "bg-ink text-paper" : "border border-line bg-surface"}`}>
                    <span className="sr-only">{mine ? "Jij" : names[m.sender_id ?? ""] ?? "Verwijderd account"}: </span>
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    {m.attachment_path && (
                      <button type="button" onClick={() => open(m.attachment_path!)} className={`mt-1 inline-flex items-center gap-1.5 text-sm underline ${mine ? "text-paper" : "text-accent"}`}>
                        <FileText className="h-4 w-4" aria-hidden /> {m.attachment_name ?? "Bijlage"}
                      </button>
                    )}
                    <p className={`mt-1 text-[11px] ${mine ? "text-paper/70" : "text-muted"}`}>{formatTime(m.created_at)}</p>
                  </div>
                  {!mine && <div className="mt-1"><ReportButton targetType="bericht" targetId={m.id} /></div>}
                </div>
              )}
            </li>
          );
        })}
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
            onChange={(e) => setText(e.target.value)}
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
  );
}
