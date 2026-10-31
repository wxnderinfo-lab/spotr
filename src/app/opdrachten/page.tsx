import Link from "next/link";
import type { Metadata } from "next";
import { getCategoryTree, hasFacetFilters, parseJobFilters, searchJobs, toQuery, PER_PAGE } from "@/lib/data";
import { getMe } from "@/lib/auth";
import { JobCard } from "@/components/cards";
import { AutoSubmitForm } from "@/components/AutoSubmit";
import { FilterPanel } from "@/components/FilterPanel";
import { PlaceInput } from "@/components/PlaceInput";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { SaveSearchButton } from "@/components/SaveSearchButton";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseJobFilters(await searchParams);
  const filtered = hasFacetFilters(f);
  return {
    title: "Opdrachten en klussen vinden",
    description: "Bekijk open opdrachten van particulieren en bedrijven: klussen op locatie en online werk. Reageer gratis met een voorstel.",
    // gefilterde combinaties niet indexeren; links blijven volgbaar
    robots: filtered ? { index: false, follow: true } : undefined,
    alternates: { canonical: f.pagina && f.pagina > 1 && !filtered ? `/opdrachten?pagina=${f.pagina}` : "/opdrachten" },
  };
}

export default async function JobsPage({ searchParams }: Props) {
  const f = parseJobFilters(await searchParams);
  const [tree, me] = await Promise.all([getCategoryTree(), getMe()]);
  const { rows, total, page, place } = await searchJobs({ ...f, sorteer: f.sorteer ?? (me?.profile.is_provider ? "match" : "nieuw") });
  const filtered = hasFacetFilters(f);
  const sort = f.sorteer ?? (me?.profile.is_provider ? "match" : "nieuw");

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: "Opdrachten" }]} />
      <PageHeader
        eyebrow="Vind werk"
        title="Opdrachten"
        intro={<>Open opdrachten van particulieren en bedrijven. Reageren is gratis: {me?.status.has_pro ? "je hebt geen maandlimiet." : "5 voorstellen per maand, of onbeperkt met Pro."}</>}
        actions={filtered && me ? <SaveSearchButton kind="opdrachten" params={f} canNotify={me.status.has_pro} /> : undefined}
      />

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside aria-label="Filters">
          <FilterPanel activeCount={Object.entries(f).filter(([k, v]) => k !== "pagina" && k !== "sorteer" && v !== undefined).length}>
          <AutoSubmitForm action="/opdrachten" className="space-y-4">
            <div>
              <label htmlFor="f-q" className="label">Zoekwoord</label>
              <input id="f-q" name="q" defaultValue={f.q} className="input" placeholder="Bijv. schilderen" />
            </div>
            <div>
              <label htmlFor="f-cat" className="label">Categorie</label>
              <select id="f-cat" name="categorie" defaultValue={f.categorie ?? ""} className="input">
                <option value="">Alle categorieën</option>
                {tree.map((p) => (
                  <optgroup key={p.id} label={p.name}>
                    <option value={p.slug}>Alles in {p.name}</option>
                    {p.children.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="label">Waar</legend>
              <select name="waar" defaultValue={f.waar ?? ""} className="input" aria-label="Online of op locatie">
                <option value="">Online en op locatie</option>
                <option value="op_locatie">Op locatie</option>
                <option value="online">Online</option>
              </select>
            </fieldset>
            <div>
              <label htmlFor="f-plaats" className="label">In de buurt van</label>
              <PlaceInput id="f-plaats" defaultSlug={place?.slug} defaultLabel={place?.name} />
            </div>
            <div>
              <label htmlFor="f-afstand" className="label">Maximale afstand</label>
              <select id="f-afstand" name="afstand" defaultValue={String(f.afstand ?? 25)} className="input">
                {[5, 10, 25, 50, 100].map((km) => <option key={km} value={km}>{km} km</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-budget" className="label">Soort budget</label>
              <select id="f-budget" name="budget" defaultValue={f.budget ?? ""} className="input">
                <option value="">Alles</option>
                <option value="vast">Vaste prijs</option>
                <option value="uur">Uurtarief</option>
                <option value="in_overleg">In overleg</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-min" className="label">Minimaal budget (€)</label>
              <input id="f-min" name="minimum" type="number" inputMode="numeric" min={1} defaultValue={f.minimum} className="input" />
            </div>
            <div>
              <label htmlFor="f-sort" className="label">Sorteren</label>
              <select id="f-sort" name="sorteer" defaultValue={sort} className="input">
                <option value="nieuw">Nieuwste eerst</option>
                {me && <option value="match">Beste match voor mij</option>}
                <option value="afstand">Dichtstbij</option>
                <option value="budget">Hoogste budget</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">Toon resultaten</button>
              {filtered && <Link href="/opdrachten" className="btn-ghost">Wissen</Link>}
            </div>
          </AutoSubmitForm>
          </FilterPanel>
        </aside>

        <section aria-labelledby="resultaten">
          <h2 id="resultaten" className="mb-3 text-sm text-muted" aria-live="polite">
            {total === 0 ? "Geen opdrachten gevonden" : `${total} opdracht${total === 1 ? "" : "en"}`}
            {place ? ` binnen ${f.afstand ?? 25} km van ${place.name}` : ""}
          </h2>
          {sort === "match" && (
            <p className="mb-4 text-sm text-ink-soft">
              Gesorteerd op match: categorie, je vaardigheden, je reisafstand en je uurtarief. Pro-leden krijgen geen voorrang.{" "}
              <Link href="/hoe-het-werkt#rangschikking" className="link">Hoe we rangschikken</Link>
            </p>
          )}
          {rows.length > 0 ? (
            <div className="grid gap-4">
              {rows.map((j) => <JobCard key={j.id} job={j} showMatch={sort === "match"} />)}
            </div>
          ) : (
            <EmptyState
              title={filtered ? "Geen opdrachten met deze filters" : "Nog geen open opdrachten"}
              action={
                <>
                  {filtered && <Link href="/opdrachten" className="btn-secondary">Filters wissen</Link>}
                  <Link href={me ? "/account/profiel" : "/aanmelden?rol=professional"} className="btn-primary">
                    {me ? "Maak je profiel compleet" : "Maak een gratis profiel"}
                  </Link>
                </>
              }
            >
              {filtered
                ? "Probeer een grotere afstand of een bredere categorie. Sla de zoekopdracht op, dan vind je hem later snel terug."
                : "Jobmarkt is net gestart. Met een compleet profiel vinden opdrachtgevers jou ook zelf, en zie je nieuwe opdrachten als eerste."}
            </EmptyState>
          )}
          <Pagination page={page} total={total} perPage={PER_PAGE} hrefFor={(p) => `/opdrachten${toQuery({ ...f, pagina: p })}`} />
        </section>
      </div>
    </div>
  );
}
