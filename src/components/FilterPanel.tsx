"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

/**
 * Filters in een uitklapbaar paneel: dicht op mobiel (resultaten eerst),
 * open op desktop. Werkt zonder JavaScript als gewone <details>.
 */
export function FilterPanel({ children, activeCount }: { children: ReactNode; activeCount: number }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches && ref.current) ref.current.open = true;
  }, []);
  return (
    <details ref={ref} className="card group lg:sticky lg:top-20">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
        {activeCount > 0 && <span className="rounded-full bg-accent px-2 text-xs font-bold text-white">{activeCount}</span>}
        <span className="ml-auto text-sm font-normal text-muted group-open:hidden">Tonen</span>
        <span className="ml-auto hidden text-sm font-normal text-muted group-open:inline">Verbergen</span>
      </summary>
      <div className="border-t border-line p-4">{children}</div>
    </details>
  );
}
