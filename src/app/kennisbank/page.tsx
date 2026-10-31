import Link from "next/link";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kennisbank: prijzen, tips en gidsen",
  description: "Praktische gidsen over prijzen, een goede opdracht schrijven, een professional kiezen en starten als zelfstandige. Met bronnen en controledatum.",
  alternates: { canonical: "/kennisbank" },
};

const kinds: Record<string, string> = { prijsgids: "Prijsgids", gids: "Gids", branche: "Branche-informatie", starters: "Voor starters" };

export default async function KnowledgeIndex() {
  const { data } = await createPublicClient()
    .from("articles")
    .select("slug, title, excerpt, kind, published_at, reviewed_at")
    .eq("status", "gepubliceerd")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: "Kennisbank" }]} />
      <PageHeader title="Kennisbank" intro="Geen nieuwsberichten, wel gidsen die je helpen beslissen. Elk artikel noemt de bronnen en wanneer we het voor het laatst controleerden." />
      {data && data.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((a) => (
            <li key={a.slug}>
              <Link href={`/kennisbank/${a.slug}`} className="card block h-full p-5 hover:border-line-strong">
                <p className="eyebrow">{kinds[a.kind]}</p>
                <h2 className="mt-1 text-lg font-bold">{a.title}</h2>
                <p className="mt-1 text-ink-soft">{a.excerpt}</p>
                <p className="mt-3 text-sm text-muted">{a.reviewed_at ? `Gecontroleerd ${formatDate(a.reviewed_at)}` : a.published_at ? formatDate(a.published_at) : ""}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nog geen artikelen" />
      )}
    </div>
  );
}
