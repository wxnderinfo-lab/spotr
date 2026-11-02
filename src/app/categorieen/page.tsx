import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { getCategoryTree } from "@/lib/data";
import { photoFor } from "@/config/photos";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Alle categorieën",
  description: "Van klussen, tuin en schoonmaak tot foto, video, ontwerp en websites. Bekijk alle categorieën op Jobmarkt.",
  alternates: { canonical: "/categorieen" },
};

export default async function CategoriesPage() {
  const tree = await getCategoryTree();
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: "Categorieën" }]} />
      <PageHeader title="Alle categorieën" intro="Lokale klussen en online werk. Ontbreekt jouw vak? Laat het weten via contact; we breiden zorgvuldig uit." />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tree.map((p) => (
          <section key={p.id} className="card overflow-hidden" aria-labelledby={`c-${p.slug}`}>
            {photoFor(p.slug) && (
              <Link href={`/categorieen/${p.slug}`} tabIndex={-1} aria-hidden className="relative block aspect-[16/9] bg-sunken">
                <Image src={photoFor(p.slug)!.src} alt="" fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 90vw" className="object-cover" />
              </Link>
            )}
            <div className="p-5">
            <h2 id={`c-${p.slug}`} className="text-lg font-bold">
              <Link href={`/categorieen/${p.slug}`} className="hover:underline">{p.name}</Link>
            </h2>
            <p className="mt-1 text-sm text-muted">{p.description}</p>
            <ul className="mt-3 space-y-1.5">
              {p.children.map((c) => (
                <li key={c.id}>
                  <Link href={`/categorieen/${p.slug}/${c.slug}`} className="text-ink-soft hover:text-ink hover:underline">{c.name}</Link>
                  {c.min_age === 18 && <span className="ml-2 text-xs text-muted">18+</span>}
                </li>
              ))}
            </ul>
            </div>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted">
        Niet alles hoort op Jobmarkt: denk aan kinderopvang, zorg, personenvervoer en financieel advies. Lees waarom in de <Link href="/communityregels" className="link">communityregels</Link>.
      </p>
    </div>
  );
}
