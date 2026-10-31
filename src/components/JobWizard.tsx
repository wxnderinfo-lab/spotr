"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import { saveJobDraft } from "@/actions/jobs";
import { PlaceInputControlled } from "./PlaceInputControlled";

type Q = { key: string; label: string; type: "text" | "select" | "number"; options?: string[] };
type Sub = { id: number; name: string; work_mode: string; questions: Q[]; regulation_note: string | null };
type Parent = { id: number; name: string; children: Sub[] };

export type WizardInitial = {
  id?: string;
  category_id: string;
  title: string;
  description: string;
  work_mode: string;
  place_slug: string;
  place_name: string;
  budget_type: string;
  budget_min: string;
  budget_max: string;
  timing: string;
  due_date: string;
  answers: Record<string, string>;
};

const STORAGE_KEY = "jobmarkt:opdracht-concept";
const empty: WizardInitial = {
  category_id: "", title: "", description: "", work_mode: "op_locatie", place_slug: "", place_name: "",
  budget_type: "vast", budget_min: "", budget_max: "", timing: "flexibel", due_date: "", answers: {},
};

export function JobWizard({ categories, loggedIn, onboarded, canContract, initial, presetCategoryId }: {
  categories: Parent[]; loggedIn: boolean; onboarded: boolean; canContract: boolean; initial: WizardInitial | null; presetCategoryId?: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<WizardInitial>(initial ?? { ...empty, category_id: presetCategoryId ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [restored, setRestored] = useState(false);

  // begonnen opdracht bewaren in deze browser, zodat hij na aanmelden terug is
  useEffect(() => {
    if (initial) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setV({ ...empty, ...JSON.parse(saved) });
        setRestored(true);
      }
    } catch {}
  }, [initial]);
  useEffect(() => {
    if (initial) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {}
  }, [v, initial]);

  const sub = useMemo(() => categories.flatMap((p) => p.children).find((c) => String(c.id) === v.category_id), [categories, v.category_id]);
  const set = (k: keyof WizardInitial, val: string) => setV((o) => ({ ...o, [k]: val }));
  const err = (k: string) => errors[k] && <p className="mt-1 text-sm font-medium text-danger" id={`${k}-error`}>{errors[k]}</p>;

  const submit = () => {
    setFormError(null);
    start(async () => {
      const res = await saveJobDraft({
        id: initial?.id,
        category_id: v.category_id,
        title: v.title,
        description: v.description,
        work_mode: v.work_mode as "op_locatie" | "online",
        place_slug: v.place_slug || undefined,
        budget_type: v.budget_type as "vast" | "uur" | "in_overleg",
        budget_min: v.budget_min,
        budget_max: v.budget_max,
        timing: v.timing as "flexibel",
        due_date: v.due_date,
        answers: v.answers,
      } as Parameters<typeof saveJobDraft>[0]);
      if (res?.fieldErrors) setErrors(res.fieldErrors);
      if (res?.error) {
        setFormError(res.error);
        return;
      }
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      router.push(`/account/opdrachten/${res?.id}`);
    });
  };

  return (
    <form
      className="mt-8 space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      {restored && (
        <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          <Info className="h-4 w-4" aria-hidden /> We hebben je begonnen opdracht teruggezet.
          <button type="button" className="link ml-auto" onClick={() => { setV(empty); setRestored(false); }}>Opnieuw beginnen</button>
        </p>
      )}

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="stap-1">
        <h2 id="stap-1" className="text-lg font-bold"><span className="text-muted">1.</span> Wat moet er gebeuren?</h2>
        <div>
          <label htmlFor="category" className="label">Categorie</label>
          <select id="category" value={v.category_id} onChange={(e) => setV((o) => ({ ...o, category_id: e.target.value, answers: {}, work_mode: categories.flatMap((p) => p.children).find((c) => String(c.id) === e.target.value)?.work_mode === "online" ? "online" : o.work_mode }))} className="input" aria-invalid={!!errors.category_id} aria-describedby={errors.category_id ? "category_id-error" : undefined}>
            <option value="">Kies een categorie</option>
            {categories.map((p) => (
              <optgroup key={p.id} label={p.name}>
                {p.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </select>
          {err("category_id")}
          {sub?.regulation_note && <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-sm">{sub.regulation_note}</p>}
        </div>
        <div>
          <label htmlFor="title" className="label">Titel</label>
          <input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={90} className="input" placeholder="Bijv. Woonkamer en gang schilderen" aria-invalid={!!errors.title} aria-describedby="title-hint" />
          <p id="title-hint" className="hint">Kort en concreet: wat en waar. {v.title.length}/90</p>
          {err("title")}
        </div>
        <div>
          <label htmlFor="description" className="label">Omschrijving</label>
          <textarea id="description" value={v.description} onChange={(e) => set("description", e.target.value)} rows={6} maxLength={5000} className="input" aria-invalid={!!errors.description} aria-describedby="desc-hint" />
          <p id="desc-hint" className="hint">Wat is de situatie, wat wil je als resultaat, en wat is er al aanwezig? Geen telefoonnummer of adres; dat deel je pas na je keuze.</p>
          {err("description")}
        </div>
        {sub && sub.questions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {sub.questions.map((q) => (
              <div key={q.key}>
                <label htmlFor={`q-${q.key}`} className="label">{q.label} <span className="font-normal text-muted">(optioneel)</span></label>
                {q.type === "select" ? (
                  <select id={`q-${q.key}`} value={v.answers[q.key] ?? ""} onChange={(e) => setV((o) => ({ ...o, answers: { ...o.answers, [q.key]: e.target.value } }))} className="input">
                    <option value="">Kies…</option>
                    {q.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input id={`q-${q.key}`} value={v.answers[q.key] ?? ""} maxLength={300} onChange={(e) => setV((o) => ({ ...o, answers: { ...o.answers, [q.key]: e.target.value } }))} className="input" />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="stap-2">
        <h2 id="stap-2" className="text-lg font-bold"><span className="text-muted">2.</span> Waar en wanneer?</h2>
        <fieldset>
          <legend className="label">Waar wordt het werk gedaan?</legend>
          <div className="flex flex-wrap gap-4">
            {[["op_locatie", "Op locatie"], ["online", "Online, op afstand"]].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2"><input type="radio" name="work_mode" value={val} checked={v.work_mode === val} onChange={() => set("work_mode", val)} className="h-4 w-4 accent-[var(--color-accent)]" />{label}</label>
            ))}
          </div>
        </fieldset>
        {v.work_mode === "op_locatie" && (
          <div>
            <label htmlFor="place" className="label">Plaats</label>
            <PlaceInputControlled id="place" value={{ slug: v.place_slug, name: v.place_name }} onChange={(p) => setV((o) => ({ ...o, place_slug: p.slug, place_name: p.name }))} invalid={!!errors.place_slug} />
            <p className="hint">Alleen de woonplaats is zichtbaar, nooit je adres.</p>
            {err("place_slug")}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="timing" className="label">Wanneer?</label>
            <select id="timing" value={v.timing} onChange={(e) => set("timing", e.target.value)} className="input">
              <option value="flexibel">Flexibel</option>
              <option value="zo_snel_mogelijk">Zo snel mogelijk</option>
              <option value="voor_datum">Vóór een datum</option>
              <option value="op_datum">Op een vaste datum</option>
            </select>
          </div>
          {(v.timing === "voor_datum" || v.timing === "op_datum") && (
            <div>
              <label htmlFor="due_date" className="label">Datum</label>
              <input id="due_date" type="date" value={v.due_date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set("due_date", e.target.value)} className="input" aria-invalid={!!errors.due_date} />
              {err("due_date")}
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="stap-3">
        <h2 id="stap-3" className="text-lg font-bold"><span className="text-muted">3.</span> Budget</h2>
        <fieldset>
          <legend className="sr-only">Soort budget</legend>
          <div className="flex flex-wrap gap-4">
            {[["vast", "Vaste prijs"], ["uur", "Per uur"], ["in_overleg", "In overleg"]].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2"><input type="radio" name="budget_type" value={val} checked={v.budget_type === val} onChange={() => set("budget_type", val)} className="h-4 w-4 accent-[var(--color-accent)]" />{label}</label>
            ))}
          </div>
        </fieldset>
        {v.budget_type !== "in_overleg" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget_min" className="label">Van (€) <span className="font-normal text-muted">(optioneel)</span></label>
              <input id="budget_min" inputMode="decimal" value={v.budget_min} onChange={(e) => set("budget_min", e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="budget_max" className="label">Tot (€)</label>
              <input id="budget_max" inputMode="decimal" value={v.budget_max} onChange={(e) => set("budget_max", e.target.value)} className="input" aria-invalid={!!errors.budget_max} />
              {err("budget_max")}
            </div>
          </div>
        )}
        <p className="text-sm text-muted">Twijfel je? Lees de <Link href="/kennisbank" className="link">prijsgidsen</Link>. Je spreekt de betaling later zelf af met de professional.</p>
      </section>

      <div className="space-y-3">
        {formError && <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium">{formError}</p>}
        {!loggedIn ? (
          <div className="card p-5">
            <p className="font-semibold">Bijna klaar. Maak een gratis account om je opdracht te plaatsen.</p>
            <p className="mt-1 text-sm text-ink-soft">Je opdracht blijft in deze browser bewaard. Na het aanmelden kom je hier terug.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/aanmelden?volgende=/opdracht-plaatsen" className="btn-primary">Account maken <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link href="/inloggen?volgende=/opdracht-plaatsen" className="btn-secondary">Inloggen</Link>
            </div>
          </div>
        ) : !onboarded ? (
          <Link href="/welkom?volgende=/opdracht-plaatsen" className="btn-primary">Maak je account af om verder te gaan</Link>
        ) : !canContract ? (
          <p className="rounded-xl border border-warn/30 bg-warn-soft p-4 text-sm">
            Omdat je 16 of 17 bent, heb je eerst toestemming van een ouder of voogd nodig. Je kunt je opdracht wel opslaan als concept.{" "}
            <Link href="/account/instellingen#toestemming" className="link">Toestemming vragen</Link>
          </p>
        ) : null}
        {loggedIn && onboarded && (
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
            {pending ? "Opslaan…" : "Bekijk je opdracht"} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
        {loggedIn && onboarded && <p className="text-sm text-muted">Nog niet openbaar: je ziet eerst een voorbeeld en kunt foto&apos;s toevoegen.</p>}
      </div>
    </form>
  );
}
