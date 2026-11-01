"use client";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";

/**
 * Toestemming voor browsermeldingen. Die verschijnen bij een nieuw bericht of
 * nieuwe melding zolang Jobmarkt in een tabblad openstaat dat niet in beeld is.
 */
export function BrowserNotifyToggle() {
  const [perm, setPerm] = useState<NotificationPermission | "niet_ondersteund" | null>(null);

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "niet_ondersteund" : Notification.permission);
  }, []);

  if (perm === null) return null;
  return (
    <div className="card mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
      <BellRing className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Meldingen in je browser</p>
        <p className="text-ink-soft">
          {perm === "granted" && "Staan aan. Je krijgt een melding bij een nieuw bericht, voorstel of vraag zolang Jobmarkt in een tabblad openstaat."}
          {perm === "default" && "Krijg een melding bij een nieuw bericht, voorstel of vraag, ook als je in een ander tabblad bezig bent."}
          {perm === "denied" && "Geblokkeerd in je browser. Zet ze aan via het slotje naast het webadres als je ze toch wilt."}
          {perm === "niet_ondersteund" && "Je browser ondersteunt geen meldingen. In de site zie je nieuwe meldingen wel direct."}
        </p>
      </div>
      {perm === "default" && (
        <button type="button" className="btn-secondary shrink-0" onClick={async () => setPerm(await Notification.requestPermission())}>
          Aanzetten
        </button>
      )}
    </div>
  );
}
