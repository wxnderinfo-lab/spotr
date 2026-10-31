"use client";
import { useEffect, useRef, useState } from "react";

type Suggestion = { name: string; slug: string; municipality: string; province: string };

/** Woonplaats kiezen als gecontroleerde combobox (voor formulieren met eigen state). */
export function PlaceInputControlled({ id, value, onChange, invalid }: {
  id: string; value: { slug: string; name: string }; onChange: (v: { slug: string; name: string }) => void; invalid?: boolean;
}) {
  const listId = `${id}-lijst`;
  const [text, setText] = useState(value.name);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setText(value.name), [value.name]);

  const search = (q: string) => {
    clearTimeout(timer.current);
    if (q.length < 2) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/plaatsen?q=${encodeURIComponent(q)}`);
      const data: Suggestion[] = r.ok ? await r.json() : [];
      setItems(data);
      setOpen(data.length > 0);
      setActive(-1);
    }, 150);
  };
  const choose = (s: Suggestion) => {
    setText(s.name);
    setOpen(false);
    onChange({ slug: s.slug, name: s.name });
  };

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={text}
        placeholder="Begin met typen, bijv. Almere"
        className="input"
        onChange={(e) => {
          setText(e.target.value);
          onChange({ slug: "", name: e.target.value });
          search(e.target.value);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(items[active]); }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <ul id={listId} role="listbox" className="card absolute z-30 mt-1 max-h-72 w-full overflow-auto p-1">
          {items.map((s, i) => (
            <li key={s.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${i === active ? "bg-sunken" : "hover:bg-sunken"}`}>
              <span className="font-medium">{s.name}</span>
              <span className="text-muted"> · {s.municipality !== s.name ? `${s.municipality}, ` : ""}{s.province}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
