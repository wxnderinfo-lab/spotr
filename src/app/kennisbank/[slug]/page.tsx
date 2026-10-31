import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { site } from "@/config/site";
import { formatDate, rel } from "@/lib/format";
import { Markdown, headings } from "@/lib/markdown";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";

type Props = { params: Promise<{ slug: string }> };

const getArticle = cache(async (slug: string) => {
  const { data } = await createPublicClient()
    .from("articles")
    .select("id, slug, title, excerpt, body, kind, seo_title, seo_description, sources, related_slugs, published_at, updated_at, reviewed_at, author:authors(name, role, bio), category:categories(slug, name, parent_id)")
    .eq("slug", slug)
    .eq("status", "gepubliceerd")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  return { ...data, author: rel(data.author) as { name: string; role: string; bio: string } | null, category: rel(data.category) as { slug: string; name: string } | null };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return { title: "Artikel niet gevonden", robots: { index: false } };
  return {
    title: a.seo_title || a.title,
    description: a.seo_description || a.excerpt,
    alternates: { canonical: `/kennisbank/${a.slug}` },
    openGraph: { type: "article", publishedTime: a.published_at ?? undefined, modifiedTime: a.updated_at },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  const toc = headings(a.body);
  const sources = (a.sources ?? []) as { title: string; url: string; accessed?: string }[];
  const { data: related } = a.related_slugs?.length
    ? await createPublicClient().from("articles").select("slug, title").in("slug", a.related_slugs).eq("status", "gepubliceerd")
    : { data: [] };
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: "Kennisbank", href: "/kennisbank" }, { name: a.title }]} />
      <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
        <article className="max-w-3xl">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{a.title}</h1>
          <p className="mt-3 text-lg text-ink-soft">{a.excerpt}</p>
          <p className="mt-4 text-sm text-muted">
            Door {a.author?.name ?? "Redactie"} · gepubliceerd {a.published_at ? formatDate(a.published_at) : ""}
            {a.reviewed_at ? ` · inhoud gecontroleerd op ${formatDate(a.reviewed_at)}` : ""}
          </p>
          <div className="prose-jm mt-8"><Markdown source={a.body} /></div>
          {sources.length > 0 && (
            <section className="mt-10 border-t border-line pt-6" aria-labelledby="bronnen">
              <h2 id="bronnen" className="text-lg font-bold">Bronnen</h2>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
                {sources.map((s, i) => (
                  <li key={i}><a href={s.url} rel="noopener noreferrer" className="link">{s.title}</a>{s.accessed ? `, geraadpleegd ${formatDate(s.accessed)}` : ""}</li>
                ))}
              </ol>
            </section>
          )}
          {a.author && <p className="mt-8 rounded-xl bg-sunken p-4 text-sm text-ink-soft"><strong className="text-ink">{a.author.name}</strong> · {a.author.bio}</p>}
          <div className="card mt-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">Klaar om iemand te zoeken?</p>
            <Link href={a.category ? `/opdracht-plaatsen?categorie=${a.category.slug}` : "/opdracht-plaatsen"} className="btn-primary">Plaats gratis je opdracht</Link>
          </div>
        </article>
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {toc.length > 1 && (
            <nav aria-label="Inhoud van dit artikel" className="text-sm">
              <p className="font-semibold">In dit artikel</p>
              <ul className="mt-2 space-y-1.5">{toc.map((h) => <li key={h.id}><a href={`#${h.id}`} className="text-ink-soft hover:text-ink hover:underline">{h.text}</a></li>)}</ul>
            </nav>
          )}
          {related && related.length > 0 && (
            <nav aria-label="Lees ook" className="text-sm">
              <p className="font-semibold">Lees ook</p>
              <ul className="mt-2 space-y-1.5">{related.map((r) => <li key={r.slug}><Link href={`/kennisbank/${r.slug}`} className="link">{r.title}</Link></li>)}</ul>
            </nav>
          )}
        </aside>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.excerpt,
          datePublished: a.published_at,
          dateModified: a.updated_at,
          inLanguage: "nl-NL",
          mainEntityOfPage: `${site.url}/kennisbank/${a.slug}`,
          author: { "@type": "Organization", name: a.author?.name ?? site.name, url: site.url },
          publisher: { "@id": `${site.url}/#organisatie` },
        }}
      />
    </div>
  );
}
