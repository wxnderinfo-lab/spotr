import Link from "next/link";

export const metadata = { title: "Pagina niet gevonden", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container-page max-w-2xl py-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">Deze pagina bestaat niet (meer)</h1>
      <p className="mt-3 text-lg text-ink-soft">Misschien is de opdracht verwijderd of is de link verkeerd overgenomen.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/opdrachten" className="btn-primary">Bekijk open opdrachten</Link>
        <Link href="/professionals" className="btn-secondary">Vind een professional</Link>
        <Link href="/" className="btn-ghost">Naar de homepage</Link>
      </div>
    </div>
  );
}
