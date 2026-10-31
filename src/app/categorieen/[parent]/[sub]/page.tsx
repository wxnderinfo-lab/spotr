import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryTree } from "@/lib/data";
import { CategoryView, categoryContent, hasContent } from "@/components/CategoryView";

type Props = { params: Promise<{ parent: string; sub: string }> };

async function find(parentSlug: string, subSlug: string) {
  const parent = (await getCategoryTree()).find((c) => c.slug === parentSlug);
  const cat = parent?.children.find((c) => c.slug === subSlug);
  return parent && cat ? { parent, cat } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { parent: p, sub } = await params;
  const found = await find(p, sub);
  if (!found) return { title: "Categorie niet gevonden", robots: { index: false } };
  const content = await categoryContent(found.cat.slug);
  return {
    title: `${found.cat.name}: opdrachten en professionals`,
    description: `${found.cat.description} Plaats gratis je opdracht of vind werk in ${found.cat.name.toLowerCase()}.`,
    alternates: { canonical: `/categorieen/${found.parent.slug}/${found.cat.slug}` },
    // zonder aanbod is de pagina dun: wel volgbaar, niet indexeren
    robots: hasContent(content) ? undefined : { index: false, follow: true },
  };
}

export default async function SubCategoryPage({ params }: Props) {
  const { parent: p, sub } = await params;
  const found = await find(p, sub);
  if (!found) notFound();
  const content = await categoryContent(found.cat.slug);
  return <CategoryView cat={found.cat} parent={found.parent} subs={[]} content={content} />;
}
