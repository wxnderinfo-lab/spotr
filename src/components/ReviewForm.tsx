import { submitReview } from "@/actions/jobs";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./forms";

function Scale({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <fieldset>
      <legend className="label">{label} {!required && <span className="font-normal text-muted">(optioneel)</span>}</legend>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} required={required} className="peer sr-only" />
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-line-strong font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
              {n}
            </span>
          </label>
        ))}
        <span className="self-center text-xs text-muted">1 = slecht, 5 = uitstekend</span>
      </div>
    </fieldset>
  );
}

export function ReviewForm({ jobId, aboutProfessional }: { jobId: string; aboutProfessional: boolean }) {
  return (
    <ActionForm action={submitReview} hideOnSuccess className="mt-4 space-y-4">
      <input type="hidden" name="job" value={jobId} />
      <Scale name="rating" label="Algemeen oordeel" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Scale name="communication" label="Communicatie" />
        {aboutProfessional && <Scale name="quality" label="Kwaliteit van het werk" />}
        <Scale name="reliability" label="Afspraken nakomen" />
      </div>
      <div>
        <label htmlFor="body" className="label">Toelichting <span className="font-normal text-muted">(optioneel)</span></label>
        <textarea id="body" name="body" rows={4} maxLength={2000} className="input" />
        <p className="hint">Eerlijk en over deze opdracht. Geen persoonsgegevens of contactgegevens.</p>
      </div>
      <SubmitButton>Beoordeling plaatsen</SubmitButton>
    </ActionForm>
  );
}
