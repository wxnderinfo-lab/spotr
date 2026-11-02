import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { createPublicClient } from "@/lib/supabase/server";
import { getCategoryTree, jobHref } from "@/lib/data";

export const revalidate = 3600;

// Alleen canonieke, indexeerbare URL's: open opdrachten, niet-dunne profielen,
// actieve diensten, gepubliceerde artikelen en categorieën met aanbod.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const u = (path: string) => `${site.url}${path}`;
  const now = new Date();
  const [tree, jobs, pros, services, articles, catJobs, catPros] = await Promise.all([
    getCategoryTree(),
    supabase.from("jobs").select("slug, code, updated_at").eq("status", "open").eq("moderation_status", "ok").gt("expires_at", now.toISOString()).order("published_at", { ascending: false }).limit(5000),
    supabase.from("profiles").select("username, updated_at, bio, headline").eq("is_provider", true).eq("status", "actief").not("username", "is", null).limit(5000),
    supabase.from("services").select("slug, updated_at").eq("status", "actief").limit(5000),
    supabase.from("articles").select("slug, updated_at").eq("status", "gepubliceerd").lte("published_at", now.toISOString()),
    supabase.from("jobs").select("category_id").eq("status", "open").eq("moderation_status", "ok").gt("expires_at", now.toISOString()),
    supabase.from("profile_categories").select("category_id"),
  ]);
  const withContent = new Set([...(catJobs.data ?? []), ...(catPros.data ?? [])].map((r) => r.category_id as number));

  const staticPages = ["/", "/opdrachten", "/professionals", "/categorieen", "/opdracht-plaatsen", "/hoe-het-werkt", "/prijzen", "/kennisbank", "/help", "/contact", "/over-jobmarkt", "/communityregels", "/voorwaarden", "/privacy", "/cookies", "/fotoverantwoording"];
  return [
    ...staticPages.map((p) => ({ url: u(p), changeFrequency: "weekly" as const })),
    ...tree.map((p) => ({ url: u(`/categorieen/${p.slug}`) })),
    ...tree.flatMap((p) => p.children.filter((c) => withContent.has(c.id)).map((c) => ({ url: u(`/categorieen/${p.slug}/${c.slug}`) }))),
    ...(jobs.data ?? []).map((j) => ({ url: u(jobHref(j)), lastModified: j.updated_at })),
    ...(pros.data ?? []).filter((p) => (p.bio ?? "").length >= 80 || p.headline).map((p) => ({ url: u(`/professionals/${p.username}`), lastModified: p.updated_at })),
    ...(services.data ?? []).map((s) => ({ url: u(`/diensten/${s.slug}`), lastModified: s.updated_at })),
    ...(articles.data ?? []).map((a) => ({ url: u(`/kennisbank/${a.slug}`), lastModified: a.updated_at })),
  ];
}
