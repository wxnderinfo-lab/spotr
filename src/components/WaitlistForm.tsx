"use client";
import { useActionState } from "react";
import { joinWaitlist } from "@/actions/public";
import { FormMessage, SubmitButton, type FormState } from "./forms";
import type { Category } from "@/lib/data";

export function WaitlistForm({ categories }: { categories: Pick<Category, "id" | "name">[] }) {
  const [state, action] = useActionState<FormState, FormData>(joinWaitlist, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
      <div>
        <label htmlFor="wl-email" className="label">E-mailadres</label>
        <input id="wl-email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label htmlFor="wl-role" className="label">Ik ben</label>
        <select id="wl-role" name="role" className="input">
          <option value="professional">Professional</option>
          <option value="opdrachtgever">Opdrachtgever</option>
          <option value="beide">Allebei</option>
        </select>
      </div>
      <div>
        <label htmlFor="wl-cat" className="label">Branche</label>
        <select id="wl-cat" name="category" className="input">
          <option value="">Alle</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <SubmitButton>Houd me op de hoogte</SubmitButton>
      <div className="sm:col-span-4"><FormMessage state={state} /></div>
      <p className="text-sm text-muted sm:col-span-4">We gebruiken je adres alleen hiervoor en verwijderen het uiterlijk na een jaar.</p>
    </form>
  );
}
