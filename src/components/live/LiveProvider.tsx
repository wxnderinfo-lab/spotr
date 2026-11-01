"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, MessageSquare, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Counts = { messages: number; notifications: number };
type Toast = { id: string; kind: "bericht" | "melding"; title: string; body: string; link: string | null };

const LiveContext = createContext<{ counts: Counts } | null>(null);

/** Live tellers voor bel en berichten; null buiten de provider (uitgelogd). */
export function useLiveCounts() {
  return useContext(LiveContext)?.counts ?? null;
}

const short = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/**
 * Houdt voor een ingelogde gebruiker alles live bij: tellers bij de bel en
 * berichten, meldingen in beeld (toasts), browsermeldingen als het tabblad op
 * de achtergrond staat, en 'laatst actief'. Zonder Realtime valt het terug
 * op elke 20 seconden ophalen.
 */
export function LiveProvider({ meId, initial, children }: { meId: string; initial: Counts; children: React.ReactNode }) {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState<Counts>(initial);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const names = useRef(new Map<string, string>());

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("my_live_counts");
    if (data) setCounts(data as Counts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback((t: Toast) => {
    setToasts((cur) => [...cur.filter((x) => x.link !== t.link || x.kind !== t.kind), t].slice(-3));
    setTimeout(() => dismiss(t.id), 7000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState === "hidden") {
      const n = new Notification(t.title, { body: t.body, tag: t.link ?? t.id, icon: "/icon.svg" });
      n.onclick = () => {
        window.focus();
        if (t.link) router.push(t.link);
        n.close();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismiss]);

  // tellers bijwerken bij elke paginawissel (de header zelf ververst niet)
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const senderName = async (id: string) => {
      if (!names.current.has(id)) {
        const { data } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
        names.current.set(id, data?.display_name ?? "Iemand");
      }
      return names.current.get(id)!;
    };
    const channel = supabase
      .channel(`live-${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${meId}` }, (p: { new: Record<string, string> }) => {
        refresh();
        // berichten krijgen hieronder hun eigen melding (met naam en tekst)
        if (p.new.kind === "bericht") return;
        show({ id: p.new.id, kind: "melding", title: p.new.title, body: p.new.body ?? "", link: p.new.link ?? null });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${meId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_reads", filter: `user_id=eq.${meId}` }, () => refresh())
      // RLS laat alleen berichten uit je eigen gesprekken door
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (p: { new: Record<string, string> }) => {
        const m = p.new;
        if (m.sender_id === meId || m.kind !== "bericht") return;
        refresh();
        const link = `/berichten/${m.conversation_id}`;
        if (pathRef.current === link && document.visibilityState === "visible") return;
        show({ id: m.id, kind: "bericht", title: `Bericht van ${await senderName(m.sender_id)}`, body: short(m.body || "Stuurde een bijlage"), link });
      })
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  // zonder Realtime: tellers regelmatig ophalen
  useEffect(() => {
    if (live) return;
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [live, refresh]);

  // 'laatst actief': elke minuut zolang het tabblad zichtbaar is
  useEffect(() => {
    const touch = () => {
      // then(): een Supabase-verzoek gaat pas de deur uit als je erop wacht
      if (document.visibilityState === "visible") supabase.rpc("touch_last_seen").then(() => {});
    };
    touch();
    const t = setInterval(touch, 60_000);
    const onVis = () => {
      touch();
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // aantal ongelezen ook in de tabtitel
  useEffect(() => {
    const total = counts.messages + counts.notifications;
    const base = document.title.replace(/^\(\d+\+?\) /, "");
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
  }, [counts, pathname]);

  return (
    <LiveContext.Provider value={{ counts }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-[4.5rem] z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:w-96">
        {toasts.map((t) => {
          const Icon = t.kind === "bericht" ? MessageSquare : Bell;
          return (
            <div key={t.id} role="status" className="toast-in card pointer-events-auto flex w-full items-start gap-3 p-4 shadow-lg">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.title}</p>
                {t.body && <p className="mt-0.5 truncate text-sm text-ink-soft">{t.body}</p>}
                {t.link && (
                  <Link href={t.link} onClick={() => dismiss(t.id)} className="mt-1 inline-block text-sm font-semibold text-accent hover:underline">
                    {t.kind === "bericht" ? "Openen" : "Bekijken"}
                  </Link>
                )}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="btn-ghost -mt-1 -mr-2 px-2" aria-label="Melding sluiten">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </LiveContext.Provider>
  );
}

/** Teller-bolletje dat live meeloopt; valt terug op de server-waarde. */
export function LiveCount({ kind, fallback, label, className }: { kind: keyof Counts; fallback: number; label: string; className?: string }) {
  const counts = useLiveCounts();
  const n = counts ? counts[kind] : fallback;
  if (!n) return null;
  return (
    <span className={className ?? "absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white"}>
      {n > 9 ? "9+" : n}
      <span className="sr-only"> {label}</span>
    </span>
  );
}
