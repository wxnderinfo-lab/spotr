"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page max-w-2xl py-20">
      <h1 className="text-3xl font-extrabold">Er ging iets mis</h1>
      <p className="mt-3 text-lg text-ink-soft">Dat ligt aan ons, niet aan jou. Probeer het opnieuw; lukt het niet, laat het ons weten.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="btn-primary">Opnieuw proberen</button>
        <Link href="/contact" className="btn-secondary">Contact</Link>
      </div>
    </div>
  );
}
