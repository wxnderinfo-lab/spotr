"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown } from "lucide-react";
import { photoFor } from "@/config/photos";

type Node = { id: number; slug: string; name: string; min_age: number; children: { id: number; slug: string; name: string; min_age: number }[] };

const MAX = 10;

/**
 * Kies wat je doet: per hoofdcategorie een fototegel, met de onderdelen als
 * chips eronder. Echte checkboxen (name="categorie"), dus het formulier werkt
 * ook zonder JavaScript; dan staan alle onderdelen gewoon open.
 */
export function CategoryPicker({ tree, initial, isMinor }: { tree: Node[]; initial: number[]; isMinor: boolean }) {
  const [chosen, setChosen] = useState<Set<number>>(new Set(initial));
  const [open, setOpen] = useState<number | null>(null);
  const [js, setJs] = useState(false);
  useEffect(() => {
    setJs(true);
    // begin bij de eerste categorie waarin al iets gekozen is
    setOpen(tree.find((p) => initial.includes(p.id) || p.children.some((c) => initial.includes(c.id)))?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: number, on: boolean) =>
    setChosen((cur) => {
      const next = new Set(cur);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const full = chosen.size >= MAX;

  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft" aria-live="polite">
        <strong className="text-ink">{chosen.size} van {MAX}</strong> gekozen.
        {full ? " Haal er eerst een weg om een andere te kiezen." : " Tik op een categorie en kies wat je doet."}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tree.map((p) => {
          const photo = photoFor(p.slug);
          const n = (chosen.has(p.id) ? 1 : 0) + p.children.filter((c) => chosen.has(c.id)).length;
          const isOpen = open === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : p.id)}
                aria-expanded={js ? isOpen : true}
                aria-controls={`cat-paneel-${p.id}`}
                className={`group block w-full overflow-hidden rounded-2xl border bg-surface text-left transition ${isOpen ? "border-accent ring-2 ring-accent/30" : n ? "border-accent" : "border-line hover:border-line-strong"}`}
              >
                <span className="relative block aspect-[4/3] bg-sunken">
                  {photo && <Image src={photo.src} alt="" fill sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />}
                  {n > 0 && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
                      <Check className="h-3.5 w-3.5" aria-hidden /> {n}
                    </span>
                  )}
                </span>
                <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="font-semibold leading-tight">{p.name}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {tree.map((p) => {
        const all = chosen.has(p.id);
        return (
          <fieldset
            key={p.id}
            id={`cat-paneel-${p.id}`}
            hidden={js && open !== p.id}
            className="mt-4 rounded-2xl border border-line bg-sunken/60 p-4"
          >
            <legend className="sr-only">{p.name}</legend>
            <p className="mb-3 font-semibold">{p.name}: wat doe je?</p>
            <div className="flex flex-wrap gap-2">
              <Chip id={p.id} label={`Alles in ${p.name.toLowerCase()}`} checked={all} disabled={!all && full} onChange={toggle} strong />
              {p.children.map((c) => {
                const minorBlocked = isMinor && c.min_age === 18;
                const on = chosen.has(c.id);
                return (
                  <Chip
                    key={c.id}
                    id={c.id}
                    label={c.name}
                    note={c.min_age === 18 ? "18+" : undefined}
                    checked={on}
                    disabled={minorBlocked || (!on && full)}
                    onChange={toggle}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">‘Alles’ telt voor elk onderdeel in deze categorie. Onderdelen met 18+ zijn voor volwassenen.</p>
          </fieldset>
        );
      })}
    </div>
  );
}

function Chip({ id, label, note, checked, disabled, onChange, strong }: {
  id: number; label: string; note?: string; checked: boolean; disabled?: boolean; onChange: (id: number, on: boolean) => void; strong?: boolean;
}) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
        checked ? "border-ink bg-ink text-paper" : "border-line-strong bg-surface hover:border-ink"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${strong && !checked ? "border-dashed" : ""}`}
    >
      <input type="checkbox" name="categorie" value={id} checked={checked} disabled={disabled} onChange={(e) => onChange(id, e.target.checked)} className="sr-only" />
      {checked && <Check className="h-3.5 w-3.5" aria-hidden />}
      {label}
      {note && <span className={`text-xs ${checked ? "text-paper/70" : "text-muted"}`}>{note}</span>}
    </label>
  );
}
