import Link from "next/link";
import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { getCategoryTree, hasFacetFilters, parseProFilters, searchPros, toQuery, PER_PAGE } from "@/lib/data";
import { getMe } from "@/lib/auth";
import { ProCard } from "@/components/cards";
import { AutoSubmitForm } from "@/components/AutoSubmit";
import { PlaceInput } from "@/components/PlaceInput";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { SaveSearchButton } from "@/components/SaveSearchButton";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseProFilters(await searchParams);
  const filtered = hasFacetFilters(f);
  return {
    title: "Professionals en zzp'ers vinden",
    description: "Vind een professional voor je klus of project, lokaal of online. Bekijk portfolio, tarieven en beoordelingen van afgeronde opdrachten.",
    robots: filtered ? { index: false, follow: true } : undefined,
    alternates: { canonical: "/professionals" },
  };
}

export default async function ProsPage({ searchParams }: Props) {
  const f = parseProFilters(await searchParams);
  const [tree, me, result] = await Promise.all([getCategoryTree(), getMe(), searchPros(f)]);
  const { rows, total, page, place } = result;
  const filtered = hasFacetFilters(f);

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: "Professionals" }]} />
      <PageHeader
        eyebrow="Vind een professional"
        title="Professionals"
        intro="Bekijk wie er bij je past, of plaats je opdracht en laat professionals zelf reageren."
        actions={
          <>
            {filtered && me && <SaveSearchButton kind="professionals" params={f} canNotify={false} />}
            <Link href="/opdracht-plaatsen" className="btn-primary">Plaats een opdracht</Link>
          </>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside aria-label="Filters">
          <AutoSubmitForm action="/professionals" className="card space-y-4 p-4 lg:sticky lg:top-20">
            <p className="flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters</p>
            <div>
              <label htmlFor="p-q" className="label">Vak of vaardigheid</label>
              <input id="p-q" name="q" defaultValue={f.q} className="input" placeholder="Bijv. schilder, editor" />
            </div>
            <div>
              <label htmlFor="p-cat" className="label">Categorie</label>
              <select id="p-cat" name="categorie" defaultValue={f.categorie ?? ""} className="input">
                <option value="">Alle categorieën</option>
                {tree.map((p) => (
                  <optgroup key={p.id} label={p.name}>
                    <option value={p.slug}>Alles in {p.name}</option>
                    {p.children.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-waar" className="label">Werkt</label>
              <select id="p-waar" name="waar" defaultValue={f.waar ?? ""} className="input">
                <option value="">Online of op locatie</option>
                <option value="op_locatie">Op locatie</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label htmlFor="p-plaats" className="label">In de buurt van</label>
              <PlaceInput id="p-plaats" defaultSlug={place?.slug} defaultLabel={place?.name} />
            </div>
            <div>
              <label htmlFor="p-afstand" className="label">Maximale afstand</label>
              <select id="p-afstand" name="afstand" defaultValue={String(f.afstand ?? 25)} className="input">
                {[5, 10, 25, 50, 100].map((km) => <option key={km} value={km}>{km} km</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-tarief" className="label">Maximaal uurtarief (€)</label>
              <input id="p-tarief" name="tarief" type="number" inputMode="numeric" min={5} defaultValue={f.tarief} className="input" />
            </div>
            <div>
              <label htmlFor="p-beoordeling" className="label">Beoordeling</label>
              <select id="p-beoordeling" name="beoordeling" defaultValue={f.beoordeling ? String(f.beoordeling) : ""} className="input">
                <option value="">Alle, ook nieuwe professionals</option>
                <option value="4">4 sterren of meer</option>
                <option value="3">3 sterren of meer</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="beschikbaar" value="ja" defaultChecked={f.beschikbaar === "ja"} className="h-4 w-4 accent-[var(--color-accent)]" />
              Alleen beschikbaar
            </label>
            <div>
              <label htmlFor="p-sort" className="label">Sorteren</label>
              <select id="p-sort" name="sorteer" defaultValue={f.sorteer ?? "relevant"} className="input">
                <option value="relevant">Relevant</option>
                <option value="afstand">Dichtstbij</option>
                <option value="tarief">Laagste uurtarief</option>
                <option value="beoordeling">Hoogste beoordeling</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">Toon resultaten</button>
              {filtered && <Link href="/professionals" className="btn-ghost">Wissen</Link>}
            </div>
          </AutoSubmitForm>
        </aside>
        <section aria-labelledby="resultaten">
          <h2 id="resultaten" className="mb-3 text-sm text-muted" aria-live="polite">
            {total === 0 ? "Geen professionals gevonden" : `${total} professional${total === 1 ? "" : "s"}`}
            {place ? ` binnen ${f.afstand ?? 25} km van ${place.name}` : ""}
          </h2>
          <p className="mb-4 text-sm text-ink-soft">
            Volgorde: zoekwoord, beschikbaarheid en afstand. Beoordelingen tellen alleen mee als je daarop sorteert, zodat starters ook gezien worden. Betaalde plaatsingen bestaan niet.{" "}
            <Link href="/hoe-het-werkt#rangschikking" className="link">Meer uitleg</Link>
          </p>
          {rows.length > 0 ? (
            <div className="grid gap-4">{rows.map((p) => <ProCard key={p.id} pro={p} />)}</div>
          ) : (
            <EmptyState
              title={filtered ? "Niemand gevonden met deze filters" : "Nog geen openbare profielen"}
              action={
                <>
                  <Link href="/opdracht-plaatsen" className="btn-primary">Plaats je opdracht</Link>
                  {filtered && <Link href="/professionals" className="btn-secondary">Filters wissen</Link>}
                </>
              }
            >
              Plaats je opdracht toch: professionals die zich later aanmelden, zien hem dan direct. Plaatsen is gratis.
            </EmptyState>
          )}
          <Pagination page={page} total={total} perPage={PER_PAGE} hrefFor={(p) => `/professionals${toQuery({ ...f, pagina: p })}`} />
        </section>
      </div>
    </div>
  );
}
