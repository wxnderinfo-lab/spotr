import Link from "next/link";
import Image from "next/image";
import { Layers } from "lucide-react";
import type { Photo } from "@/config/photos";
import { euro, workModeLabel } from "@/lib/format";
import { publicUrl } from "@/lib/storage";

export type ServicePackage = { name: string; price_cents: number; description?: string; delivery?: string };
export type ServiceCardData = {
  slug: string; title: string; price_type: string; price_cents: number | null; work_mode: string;
  cover_path: string | null; packages: ServicePackage[] | null;
};

export const servicePriceText = (s: { price_type: string; price_cents: number | null }) =>
  s.price_type === "op_aanvraag" ? "Prijs op aanvraag" : `${s.price_type === "vanaf" ? "Vanaf " : ""}${euro(s.price_cents)}${s.price_type === "uur" ? " per uur" : ""}`;

/** Dienst als kaart: eigen omslagfoto, anders de foto van de categorie. */
export function ServiceCard({ s, fallback, children }: { s: ServiceCardData; fallback: Photo | null; children?: React.ReactNode }) {
  const cover = publicUrl("portfolio", s.cover_path);
  const pk = s.packages?.length ?? 0;
  return (
    <article className="card group flex flex-col overflow-hidden">
      <Link href={`/diensten/${s.slug}`} className="relative block aspect-[16/10] bg-sunken" tabIndex={-1} aria-hidden>
        {cover ? (
          // eigen foto's zijn bij uploaden al verkleind naar webp
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : fallback ? (
          <Image src={fallback.src} alt="" fill sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw" className="object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : null}
        {pk > 1 && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur">
            <Layers className="h-3.5 w-3.5" aria-hidden /> {pk} pakketten
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-snug">
          <Link href={`/diensten/${s.slug}`} className="hover:underline">{s.title}</Link>
        </h3>
        <p className="mt-1 text-sm text-muted">{workModeLabel[s.work_mode]}</p>
        <p className="mt-auto pt-3 font-bold">{servicePriceText(s)}</p>
        {children}
      </div>
    </article>
  );
}

/** Pakketten naast elkaar (Basis, Plus, Compleet), zonder 'populair'-label: dat weten we niet. */
export function ServicePackages({ packages, categorySlug }: { packages: ServicePackage[]; categorySlug: string }) {
  if (!packages.length) return null;
  return (
    <section aria-labelledby="pakketten" className="mt-8">
      <h2 id="pakketten" className="mb-3 text-xl font-bold">Pakketten</h2>
      <ul className={`grid gap-3 ${packages.length === 3 ? "md:grid-cols-3" : packages.length === 2 ? "sm:grid-cols-2" : ""}`}>
        {packages.map((p, i) => (
          <li key={i} className="card flex flex-col p-5">
            <p className="text-sm font-semibold tracking-wide text-muted uppercase">{p.name}</p>
            <p className="mt-1 text-2xl font-extrabold">{euro(p.price_cents)}</p>
            {p.description && <p className="mt-2 text-sm text-ink-soft">{p.description}</p>}
            {p.delivery && <p className="mt-3 text-sm text-muted">{p.delivery}</p>}
            <div className="mt-auto pt-4">
              <Link href={`/opdracht-plaatsen?categorie=${categorySlug}`} className="btn-secondary w-full whitespace-nowrap">
                Kiezen<span className="sr-only"> pakket {p.name}</span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Prijzen zoals de professional ze opgeeft. Je spreekt de definitieve prijs samen af in een voorstel.</p>
    </section>
  );
}
