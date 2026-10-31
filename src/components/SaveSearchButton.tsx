"use client";
import { useState, useTransition } from "react";
import { BookmarkPlus } from "lucide-react";
import { saveSearch } from "@/actions/engage";
import type { FormState } from "./forms";
import { FormMessage } from "./forms";

export function SaveSearchButton({ kind, params, canNotify }: { kind: "opdrachten" | "professionals"; params: Record<string, unknown>; canNotify: boolean }) {
  const [state, setState] = useState<FormState>(null);
  const [notify, setNotify] = useState(canNotify);
  const [pending, start] = useTransition();
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex items-center gap-3">
        {kind === "opdrachten" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} disabled={!canNotify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            Melding bij nieuwe opdrachten{!canNotify && " (Pro)"}
          </label>
        )}
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => start(async () => setState(await saveSearch(kind, params, notify && canNotify)))}>
          <BookmarkPlus className="h-4 w-4" aria-hidden /> Zoekopdracht opslaan
        </button>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
