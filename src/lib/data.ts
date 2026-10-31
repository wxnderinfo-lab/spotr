import "server-only";
import { cache } from "react";
import { createClient, createPublicClient } from "@/lib/supabase/server";

export type Category = {
  id: number;
  parent_id: number | null;
  slug: string;
  name: string;
  description: string;
  work_mode: "op_locatie" | "online" | "beide";
  min_age: 16 | 18;
  regulation_note: string | null;
  questions: { key: string; label: string; type: "text" | "select" | "number"; options?: string[] }[];
  sort_order: number;
};
export type CategoryNode = Category & { children: Category[] };

export const getCategories = cache(async (): Promise<Category[]> => {
  const { data } = await createPublicClient()
    .from("categories")
    .select("id, parent_id, slug, name, description, work_mode, min_age, regulation_note, questions, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as Category[];
});

export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const all = await getCategories();
  return all
    .filter((c) => c.parent_id === null)
    .map((p) => ({ ...p, children: all.filter((c) => c.parent_id === p.id) }));
});

export async function categoryPath(slug: string) {
  const all = await getCategories();
  const cat = all.find((c) => c.slug === slug);
  if (!cat) return null;
  const parent = cat.parent_id ? all.find((c) => c.id === cat.parent_id) ?? null : null;
  return { cat, parent, href: parent ? `/categorieen/${parent.slug}/${cat.slug}` : `/categorieen/${cat.slug}` };
}

export type Place = { id: number; name: string; slug: string; municipality: string; province: string };

export async function getPlace(slug: string | undefined | null): Promise<Place | null> {
  if (!slug) return null;
  const { data } = await createPublicClient().from("places").select("id, name, slug, municipality, province").eq("slug", slug).maybeSingle();
  return data;
}

// ── Opdrachten zoeken ──────────────────────────────────────────────────────

export type JobFilters = {
  q?: string;
  categorie?: string;
  waar?: "online" | "op_locatie";
  plaats?: string;
  afstand?: number;
  budget?: "vast" | "uur" | "in_overleg";
  minimum?: number; // euro's
  sorteer?: "nieuw" | "match" | "afstand" | "budget";
  pagina?: number;
};

// Veelgebruikte namen die in de BAG anders heten.
const placeAliases: Record<string, string> = { "den-haag": "s-gravenhage", "den-bosch": "s-hertogenbosch" };

export function placeSlug(v: string | undefined) {
  if (!v) return undefined;
  const s = v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return placeAliases[s] ?? (s || undefined);
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]) => (v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined);
const int = (v: string | undefined, min: number, max: number) => {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

export function parseJobFilters(sp: Record<string, string | string[] | undefined>): JobFilters {
  return {
    q: first(sp.q)?.slice(0, 80),
    categorie: first(sp.categorie)?.replace(/[^a-z0-9-]/g, ""),
    waar: oneOf(first(sp.waar), ["online", "op_locatie"] as const),
    plaats: placeSlug(first(sp.plaats)),
    afstand: int(first(sp.afstand), 1, 200),
    budget: oneOf(first(sp.budget), ["vast", "uur", "in_overleg"] as const),
    minimum: int(first(sp.minimum), 1, 100000),
    sorteer: oneOf(first(sp.sorteer), ["nieuw", "match", "afstand", "budget"] as const),
    pagina: int(first(sp.pagina), 1, 500),
  };
}

/** Elke filter behalve paginering maakt een pagina niet-indexeerbaar (geen eindeloze combinaties). */
export function hasFacetFilters(f: Record<string, unknown>) {
  return Object.entries(f).some(([k, v]) => k !== "pagina" && v !== undefined && v !== "");
}

export function toQuery(f: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "" && !(k === "pagina" && v === 1)) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export type JobRow = {
  id: string; code: string; slug: string; title: string; excerpt: string;
  category_name: string; category_slug: string; work_mode: "online" | "op_locatie"; place_name: string | null; distance_km: number | null;
  budget_type: string; budget_min_cents: number | null; budget_max_cents: number | null; timing: string; due_date: string | null;
  published_at: string; proposal_count: number; match_score: number; match_reasons: string[]; total_count: number;
};

export const PER_PAGE = 20;

export async function searchJobs(f: JobFilters, perPage = PER_PAGE) {
  const supabase = await createClient();
  const place = await getPlace(f.plaats);
  const page = f.pagina ?? 1;
  const { data, error } = await supabase.rpc("search_jobs", {
    p_q: f.q ?? null,
    p_category: f.categorie ?? null,
    p_mode: f.waar ?? null,
    p_place: place?.id ?? null,
    p_radius_km: place ? f.afstand ?? 25 : null,
    p_budget_type: f.budget ?? null,
    p_min_budget_cents: f.minimum ? f.minimum * 100 : null,
    p_sort: f.sorteer ?? "nieuw",
    p_limit: perPage,
    p_offset: (page - 1) * perPage,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as JobRow[];
  return { rows, total: rows[0]?.total_count ?? 0, page, place };
}

// ── Professionals zoeken ───────────────────────────────────────────────────

export type ProFilters = {
  q?: string;
  categorie?: string;
  waar?: "online" | "op_locatie";
  plaats?: string;
  afstand?: number;
  tarief?: number; // max euro per uur
  beschikbaar?: "ja";
  beoordeling?: number; // minimaal
  sorteer?: "relevant" | "beoordeling" | "tarief" | "afstand";
  pagina?: number;
};

export function parseProFilters(sp: Record<string, string | string[] | undefined>): ProFilters {
  return {
    q: first(sp.q)?.slice(0, 80),
    categorie: first(sp.categorie)?.replace(/[^a-z0-9-]/g, ""),
    waar: oneOf(first(sp.waar), ["online", "op_locatie"] as const),
    plaats: placeSlug(first(sp.plaats)),
    afstand: int(first(sp.afstand), 1, 200),
    tarief: int(first(sp.tarief), 5, 1000),
    beschikbaar: oneOf(first(sp.beschikbaar), ["ja"] as const),
    beoordeling: int(first(sp.beoordeling), 1, 5),
    sorteer: oneOf(first(sp.sorteer), ["relevant", "beoordeling", "tarief", "afstand"] as const),
    pagina: int(first(sp.pagina), 1, 500),
  };
}

export type ProRow = {
  id: string; username: string; display_name: string; avatar_path: string | null; headline: string; place_name: string | null; distance_km: number | null;
  works_online: boolean; works_on_location: boolean; hourly_rate_cents: number | null; provider_type: "particulier" | "zakelijk"; company_name: string | null;
  availability: string; kvk_verified: boolean; rating_avg: number | null; rating_count: number; completed_count: number;
  categories: string[]; match_reasons: string[]; total_count: number;
};

export async function searchPros(f: ProFilters, perPage = PER_PAGE) {
  const supabase = await createClient();
  const place = await getPlace(f.plaats);
  const page = f.pagina ?? 1;
  const { data, error } = await supabase.rpc("search_professionals", {
    p_q: f.q ?? null,
    p_category: f.categorie ?? null,
    p_mode: f.waar ?? null,
    p_place: place?.id ?? null,
    p_radius_km: place ? f.afstand ?? 25 : null,
    p_max_rate_cents: f.tarief ? f.tarief * 100 : null,
    p_available: f.beschikbaar === "ja" ? true : null,
    p_min_rating: f.beoordeling ?? null,
    p_sort: f.sorteer ?? "relevant",
    p_limit: perPage,
    p_offset: (page - 1) * perPage,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ProRow[];
  return { rows, total: rows[0]?.total_count ?? 0, page, place };
}

export function jobHref(j: { slug: string; code: string }) {
  return `/opdrachten/${j.slug}-${j.code}`;
}
