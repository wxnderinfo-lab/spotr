import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryTree } from "@/lib/data";
import { CategoryView, categoryContent } from "@/components/CategoryView";

type Props = { params: Promise<{ parent: string }> };

async function find(slug: string) {
  return (await getCategoryTree()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await find((await params).parent);
  if (!cat) return { title: "Categorie niet gevonden", robots: { index: false } };
  return {
    title: `${cat.name}: opdrachten en professionals`,
    description: `${cat.description} Plaats gratis een opdracht of vind werk in ${cat.name.toLowerCase()}: ${cat.children.slice(0, 4).map((c) => c.name.toLowerCase()).join(", ")}.`,
    alternates: { canonical: `/categorieen/${cat.slug}` },
  };
}

export default async function ParentCategoryPage({ params }: Props) {
  const cat = await find((await params).parent);
  if (!cat) notFound();
  const content = await categoryContent(cat.slug);
  return <CategoryView cat={cat} parent={null} subs={cat.children} content={content} />;
}
