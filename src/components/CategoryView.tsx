import Link from "next/link";
import Image from "next/image";
import { photoFor } from "@/config/photos";
import type { Category, CategoryNode } from "@/lib/data";
import { searchJobs, searchPros } from "@/lib/data";
import { createPublicClient } from "@/lib/supabase/server";
import { JobCard, ProCard } from "./cards";
import { Breadcrumbs } from "./Breadcrumbs";
import { EmptyState, Notice, PageHeader } from "./ui";

export async function categoryContent(slug: string) {
  const [jobs, pros, { data: articles }] = await Promise.all([
    searchJobs({ categorie: slug }, 8),
    searchPros({ categorie: slug }, 6),
    createPublicClient().from("articles").select("slug, title, excerpt, category:categories!inner(slug)").eq("categories.slug", slug).eq("status", "gepubliceerd").limit(3),
  ]);
  return { jobs, pros, articles: articles ?? [] };
}

export function CategoryView({ cat, parent, subs, content }: {
  cat: Category; parent: Category | null; subs: Category[]; content: Awaited<ReturnType<typeof categoryContent>>;
}) {
  const { jobs, pros, articles } = content;
  const photo = photoFor(cat.slug, parent?.slug);
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: "Categorieën", href: "/categorieen" }, ...(parent ? [{ name: parent.name, href: `/categorieen/${parent.slug}` }] : []), { name: cat.name }]} />
      {photo && (
        <div className="relative mb-8 aspect-[3/1] overflow-hidden rounded-2xl bg-sunken sm:aspect-[4/1]">
          <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
        </div>
      )}
      <PageHeader
        eyebrow={parent?.name ?? "Categorie"}
        title={cat.name}
        intro={cat.description}
        actions={
          <>
            <Link href={`/opdracht-plaatsen?categorie=${cat.slug}`} className="btn-primary">Plaats een opdracht</Link>
            <Link href={`/opdrachten?categorie=${cat.slug}`} className="btn-secondary">Vind werk</Link>
          </>
        }
      />
      {cat.regulation_note && <div className="mb-8"><Notice tone="info" title="Goed om te weten">{cat.regulation_note}</Notice></div>}
      {cat.min_age === 18 && <p className="-mt-4 mb-8 text-sm text-muted">In deze categorie kunnen alleen professionals van 18 jaar en ouder reageren.</p>}

      {subs.length > 0 && (
        <nav aria-label={`Onderdelen van ${cat.name}`} className="mb-10">
          <ul className="flex flex-wrap gap-2">
            {subs.map((s) => (
              <li key={s.id}><Link href={`/categorieen/${cat.slug}/${s.slug}`} className="chip px-3 py-1.5 text-sm hover:border-line-strong">{s.name}</Link></li>
            ))}
          </ul>
        </nav>
      )}

      <section aria-labelledby="open" className="mb-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="open" className="text-xl font-bold">Open opdrachten</h2>
          {jobs.total > jobs.rows.length && <Link href={`/opdrachten?categorie=${cat.slug}`} className="link text-sm">Alle {jobs.total} opdrachten</Link>}
        </div>
        {jobs.rows.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{jobs.rows.map((j) => <JobCard key={j.id} job={j} />)}</div>
        ) : (
          <EmptyState title={`Nog geen open opdrachten in ${cat.name.toLowerCase()}`} action={<Link href={`/opdracht-plaatsen?categorie=${cat.slug}`} className="btn-primary">Plaats de eerste</Link>}>
            Heb je iets te doen in deze categorie? Plaats het gratis; professionals die deze categorie kiezen, zien het direct.
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="pros" className="mb-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="pros" className="text-xl font-bold">Professionals</h2>
          {pros.total > pros.rows.length && <Link href={`/professionals?categorie=${cat.slug}`} className="link text-sm">Alle {pros.total} professionals</Link>}
        </div>
        {pros.rows.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{pros.rows.map((p) => <ProCard key={p.id} pro={p} />)}</div>
        ) : (
          <EmptyState title="Nog geen profielen in deze categorie" action={<Link href="/aanmelden?rol=professional" className="btn-secondary">Meld je aan als professional</Link>}>
            Werk je in {cat.name.toLowerCase()}? Met een gratis profiel ben je hier als eerste te vinden.
          </EmptyState>
        )}
      </section>

      {articles.length > 0 && (
        <section aria-labelledby="lees" className="mb-6">
          <h2 id="lees" className="mb-4 text-xl font-bold">Lees ook</h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {articles.map((a) => (
              <li key={a.slug}><Link href={`/kennisbank/${a.slug}`} className="card block p-4 hover:border-line-strong"><span className="font-semibold">{a.title}</span><span className="mt-1 block text-sm text-muted">{a.excerpt}</span></Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function hasContent(c: Awaited<ReturnType<typeof categoryContent>>) {
  return c.jobs.total > 0 || c.pros.total > 0;
}

export type { CategoryNode };
