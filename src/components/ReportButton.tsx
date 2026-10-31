import { Flag } from "lucide-react";
import { submitReport } from "@/actions/engage";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./forms";

const reasons: [string, string][] = [
  ["spam", "Spam of reclame"],
  ["oplichting", "Mogelijke oplichting"],
  ["verboden_dienst", "Dienst die niet is toegestaan"],
  ["contactgegevens", "Contactgegevens of links in openbare tekst"],
  ["ongepast", "Ongepaste inhoud"],
  ["intimidatie", "Intimidatie of bedreiging"],
  ["nep_beoordeling", "Nepbeoordeling"],
  ["minderjarige", "Zorg over een minderjarige"],
  ["anders", "Iets anders"],
];

/** Melden zonder JavaScript: een uitklapbaar formulier (details/summary). */
export function ReportButton({ targetType, targetId, label = "Melden" }: { targetType: string; targetId: string; label?: string }) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <Flag className="h-4 w-4" aria-hidden /> {label}
      </summary>
      <ActionForm action={submitReport} hideOnSuccess className="card mt-2 max-w-md space-y-3 p-4">
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />
        <div>
          <label htmlFor={`r-${targetId}`} className="label">Wat is er aan de hand?</label>
          <select id={`r-${targetId}`} name="reason" required className="input">
            {reasons.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`rd-${targetId}`} className="label">Toelichting <span className="font-normal text-muted">(optioneel)</span></label>
          <textarea id={`rd-${targetId}`} name="details" rows={3} maxLength={2000} className="input" />
        </div>
        <p className="text-xs text-muted">Je melding is vertrouwelijk. We nemen een gemotiveerd besluit en laten je dat weten.</p>
        <SubmitButton className="btn-secondary">Melding versturen</SubmitButton>
      </ActionForm>
    </details>
  );
}
