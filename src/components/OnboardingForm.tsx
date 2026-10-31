"use client";
import Link from "next/link";
import { useActionState } from "react";
import { completeOnboarding } from "@/actions/auth";
import { FormMessage, SubmitButton, type FormState } from "./forms";
import { Field } from "./ui";

export function OnboardingForm({ displayName, usernameSuggestion, defaultRole, next, birthdate }: {
  displayName: string; usernameSuggestion: string; defaultRole: string; next: string; birthdate: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(completeOnboarding, null);
  const fe = state?.fieldErrors ?? {};
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 16);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="volgende" value={next} />
      <Field label="Naam op je profiel" htmlFor="display_name" error={fe.display_name}>
        <input id="display_name" name="display_name" defaultValue={displayName} required minLength={2} maxLength={60} className="input" aria-invalid={!!fe.display_name} />
      </Field>
      <Field label="Profielnaam (in je link)" htmlFor="username" error={fe.username} hint={<>jobmarkt.nl/professionals/<strong>{usernameSuggestion}</strong>, alleen kleine letters, cijfers en streepjes.</>}>
        <input id="username" name="username" defaultValue={usernameSuggestion} required pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" className="input" aria-invalid={!!fe.username} />
      </Field>
      <Field label="Geboortedatum" htmlFor="birthdate" error={fe.birthdate} hint="Niet openbaar. Kan later niet zelf worden gewijzigd.">
        <input id="birthdate" name="birthdate" type="date" required defaultValue={birthdate ?? ""} max={maxDate.toISOString().slice(0, 10)} min="1900-01-01" className="input" aria-invalid={!!fe.birthdate} />
      </Field>
      <fieldset>
        <legend className="label">Wat wil je doen?</legend>
        <div className="grid gap-2">
          {[
            ["opdrachtgever", "Opdrachten plaatsen", "Ik zoek iemand voor een klus of project."],
            ["professional", "Werken als professional", "Ik wil gevonden worden en reageren op opdrachten."],
            ["beide", "Allebei", "Je kunt later altijd wisselen."],
          ].map(([v, t, d]) => (
            <label key={v} className="card flex cursor-pointer items-start gap-3 p-3 has-[:checked]:border-accent">
              <input type="radio" name="rol" value={v} defaultChecked={v === defaultRole} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
              <span><span className="font-semibold">{t}</span><span className="block text-sm text-muted">{d}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="akkoord" value="ja" required className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
        <span>Ik ben 16 jaar of ouder en ga akkoord met de <Link href="/voorwaarden" className="link">voorwaarden</Link> en <Link href="/communityregels" className="link">communityregels</Link>.</span>
      </label>
      {fe.akkoord && <p className="text-sm font-medium text-danger">{fe.akkoord}</p>}
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full">Verder</SubmitButton>
    </form>
  );
}
