import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { site } from "@/config/site";
import { categoryPath, categoryPhoto } from "@/lib/data";
import { euro, rel, workModeLabel } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Avatar, Stars } from "@/components/ui";
import { ReportButton } from "@/components/ReportButton";
import { JsonLd } from "@/components/JsonLd";
import { ServicePackages, type ServicePackage } from "@/components/ServiceCard";
import Image from "next/image";

type Props = { params: Promise<{ slug: string }> };

const getService = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select(`id, slug, title, description, price_type, price_cents, delivery_note, work_mode, status, updated_at, cover_path, packages,
      category:categories(slug, name),
      provider:profiles!services_provider_id_fkey(id, username, display_name, avatar_path, headline, provider_type, place:places(name))`)
    .eq("slug", slug)
    .eq("status", "actief")
    .maybeSingle();
  if (!data) return null;
  const provider = rel(data.provider) as { id: string; username: string; display_name: string; avatar_path: string | null; headline: string; provider_type: string; place: unknown } | null;
  return {
    ...data,
    category: rel(data.category) as { slug: string; name: string } | null,
    provider: provider ? { ...provider, place: rel(provider.place as { name: string } | { name: string }[] | null) } : null,
  };
});

const priceText = (s: { price_type: string; price_cents: number | null }) =>
  s.price_type === "op_aanvraag" ? "Prijs op aanvraag" : `${s.price_type === "vanaf" ? "Vanaf " : ""}${euro(s.price_cents)}${s.price_type === "uur" ? " per uur" : ""}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getService((await params).slug);
  if (!s || !s.provider) return { title: "Dienst niet gevonden", robots: { index: false } };
  return {
    title: `${s.title} door ${s.provider.display_name}`,
    description: `${s.description.slice(0, 140).replace(/\s+/g, " ")}… ${priceText(s)}.`,
    alternates: { canonical: `/diensten/${s.slug}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const s = await getService((await params).slug);
  if (!s || !s.provider || !s.category) notFound();
  const supabase = await createClient();
  const { data: stats } = await supabase.rpc("profile_stats", { p_profile: s.provider.id });
  const cat = await categoryPath(s.category.slug);
  const photo = await categoryPhoto(s.category.slug);
  const cover = publicUrl("portfolio", s.cover_path);
  const packages = (s.packages ?? []) as ServicePackage[];

  return (
    <div className="container-page max-w-4xl py-8">
      <Breadcrumbs items={[{ name: "Categorieën", href: "/categorieen" }, ...(cat ? [{ name: cat.cat.name, href: cat.href }] : []), { name: s.title }]} />
      <div className="relative mb-6 aspect-[21/9] overflow-hidden rounded-2xl bg-sunken">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={`Werk van ${s.provider.display_name}`} className="h-full w-full object-cover" />
        ) : photo ? (
          <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 896px) 896px, 100vw" className="object-cover" />
        ) : null}
      </div>
      <h1 className="text-3xl font-extrabold">{s.title}</h1>
      <p className="mt-2 text-lg font-semibold">{priceText(s)}</p>
      <p className="text-sm text-muted">{workModeLabel[s.work_mode]}{s.delivery_note ? ` · ${s.delivery_note}` : ""}</p>
      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_18rem]">
        <div>
          <div className="whitespace-pre-line text-ink-soft">{s.description}</div>
          <ServicePackages packages={packages} categorySlug={s.category.slug} />
        </div>
        <aside className="card h-fit p-5">
          <div className="flex items-center gap-3">
            <Avatar src={publicUrl("avatars", s.provider.avatar_path)} name={s.provider.display_name} size={48} />
            <div>
              <Link href={`/professionals/${s.provider.username}`} className="font-semibold hover:underline">{s.provider.display_name}</Link>
              <p className="text-sm text-muted">{s.provider.provider_type === "zakelijk" ? "Zakelijk" : "Particulier"}{s.provider.place ? ` · ${s.provider.place.name}` : ""}</p>
            </div>
          </div>
          <div className="mt-3"><Stars value={stats?.rating_avg ?? null} count={stats?.rating_count ?? 0} /></div>
          <p className="mt-3 text-sm text-ink-soft">Wil je dit laten doen? Plaats je opdracht en noem deze dienst; de professional kan dan een voorstel sturen.</p>
          <Link href={`/opdracht-plaatsen?categorie=${s.category.slug}`} className="btn-primary mt-4 w-full">Plaats een opdracht</Link>
        </aside>
      </div>
      <div className="mt-8"><ReportButton targetType="dienst" targetId={s.id} label="Dienst melden" /></div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: s.title,
          description: s.description.slice(0, 500),
          serviceType: s.category.name,
          url: `${site.url}/diensten/${s.slug}`,
          areaServed: s.work_mode === "online" ? { "@type": "Country", name: "Nederland" } : s.provider.place?.name,
          provider: { "@type": "Person", name: s.provider.display_name, url: `${site.url}/professionals/${s.provider.username}` },
          ...(packages.length > 1
            ? { offers: { "@type": "AggregateOffer", priceCurrency: "EUR", offerCount: packages.length, lowPrice: (Math.min(...packages.map((p) => p.price_cents)) / 100).toFixed(2), highPrice: (Math.max(...packages.map((p) => p.price_cents)) / 100).toFixed(2) } }
            : s.price_cents && s.price_type !== "op_aanvraag"
              ? { offers: { "@type": "Offer", priceCurrency: "EUR", price: (s.price_cents / 100).toFixed(2) } }
              : {}),
        }}
      />
    </div>
  );
}
