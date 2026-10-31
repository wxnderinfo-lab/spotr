// Beeldmerk: afgeleid van het Spotr-logo (dikke, afgeronde boogstreek plus
// een losse punt). Bij Jobmarkt vormt de boog een kleine "j" en is de punt
// de i-punt in de accentkleur: de "spot" uit Spotr leeft zo voort.
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <path d="M26 16.5V26a9 9 0 0 1-9 9h-2.5" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M8.5 13.5a9 9 0 0 1 9-9" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity="0.18" />
      <circle cx="26" cy="7" r="4.6" fill="var(--color-accent)" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <LogoMark className="h-8 w-8" />
      <span className="text-[1.3rem] font-extrabold tracking-[-0.03em]">Jobmarkt</span>
    </span>
  );
}
