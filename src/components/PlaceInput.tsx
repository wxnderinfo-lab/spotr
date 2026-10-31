"use client";
import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { name: string; slug: string; municipality: string; province: string };

/**
 * Woonplaats kiezen. Zonder JavaScript is het een gewoon tekstveld (de server
 * zet de naam om naar een plaats); met JavaScript een toegankelijke combobox.
 */
export function PlaceInput({ name = "plaats", defaultSlug, defaultLabel, id, required, placeholder = "Bijv. Almere" }: {
  name?: string; defaultSlug?: string; defaultLabel?: string; id?: string; required?: boolean; placeholder?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-lijst`;
  const [text, setText] = useState(defaultLabel ?? "");
  const [slug, setSlug] = useState(defaultSlug ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (text.length < 2 || (slug && text === defaultLabel)) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/plaatsen?q=${encodeURIComponent(text)}`);
      const data: Suggestion[] = r.ok ? await r.json() : [];
      setItems(data);
      setOpen(data.length > 0);
      setActive(-1);
    }, 150);
  }, [text, slug, defaultLabel]);

  const choose = (s: Suggestion) => {
    setText(s.name);
    setSlug(s.slug);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={text}
        name={slug ? undefined : name}
        onChange={(e) => {
          setText(e.target.value);
          setSlug("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(items[active]); }
          if (e.key === "Escape") setOpen(false);
        }}
        className="input"
      />
      {slug && <input type="hidden" name={name} value={slug} />}
      {open && (
        <ul id={listId} role="listbox" className="card absolute z-30 mt-1 max-h-72 w-full overflow-auto p-1">
          {items.map((s, i) => (
            <li
              key={s.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${i === active ? "bg-sunken" : "hover:bg-sunken"}`}
            >
              <span className="font-medium">{s.name}</span>
              <span className="text-muted"> · {s.municipality !== s.name ? `${s.municipality}, ` : ""}{s.province}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
