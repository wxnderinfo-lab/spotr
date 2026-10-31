"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/errors";
import type { FormState } from "@/components/forms";

// Alle beheeracties lopen via databasefuncties die zelf de rol controleren
// (is_moderator / is_admin) en het auditlog bijwerken. Deze laag valideert
// alleen invoer; een gewone gebruiker krijgt van de database 'geen_toegang'.

async function rpc(name: string, args: Record<string, unknown>, path: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args);
  if (error) return { error: errorMessage(error) };
  revalidatePath(path);
  return { ok: true, message: "Opgeslagen en vastgelegd in het auditlog." };
}

export async function handleReport(_: FormState, fd: FormData) {
  return rpc("mod_handle_report", {
    p_report: String(fd.get("id")),
    p_status: String(fd.get("status")),
    p_resolution: String(fd.get("resolution") ?? ""),
    p_action: String(fd.get("action") ?? "geen"),
  }, "/beheer/meldingen");
}

export async function reviewJob(_: FormState, fd: FormData) {
  return rpc("mod_review_job", { p_job: String(fd.get("id")), p_approve: fd.get("approve") === "1", p_reason: String(fd.get("reason") ?? "") }, "/beheer/opdrachten");
}

export async function resolveDispute(_: FormState, fd: FormData) {
  return rpc("mod_resolve_dispute", { p_job: String(fd.get("id")), p_to: String(fd.get("to")), p_note: String(fd.get("note") ?? "") }, "/beheer/opdrachten");
}

export async function setUserStatus(_: FormState, fd: FormData) {
  return rpc("admin_set_user_status", { p_user: String(fd.get("id")), p_status: String(fd.get("status")), p_reason: String(fd.get("reason") ?? "") }, "/beheer/gebruikers");
}

export async function setRole(_: FormState, fd: FormData) {
  return rpc("admin_set_role", { p_user: String(fd.get("id")), p_role: String(fd.get("role")), p_grant: fd.get("grant") === "1" }, "/beheer/gebruikers");
}

export async function reviewVerification(_: FormState, fd: FormData) {
  return rpc("admin_review_verification", { p_verification: String(fd.get("id")), p_approve: fd.get("approve") === "1", p_note: String(fd.get("note") ?? "") }, "/beheer/verificaties");
}

export async function setSetting(_: FormState, fd: FormData): Promise<FormState> {
  const key = String(fd.get("key"));
  let value: unknown;
  try {
    value = JSON.parse(String(fd.get("value")));
  } catch {
    return { error: "Geen geldige JSON. Een datum schrijf je als \"2027-03-31\" (met aanhalingstekens), uit als null." };
  }
  return rpc("admin_set_setting", { p_key: key, p_value: value }, "/beheer/instellingen");
}

const articleSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: kleine letters, cijfers en streepjes."),
  title: z.string().trim().min(10).max(110),
  excerpt: z.string().trim().max(300).default(""),
  body: z.string().max(60000).default(""),
  kind: z.enum(["prijsgids", "gids", "branche", "starters"]),
  author_id: z.string().uuid(),
  category_id: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["concept", "gepubliceerd", "gearchiveerd"]),
  seo_title: z.string().trim().max(70).default(""),
  seo_description: z.string().trim().max(170).default(""),
  sources: z.string().default("[]"),
  related_slugs: z.string().default(""),
  reviewed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
});

export async function saveArticle(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = articleSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  let sources: unknown;
  try {
    sources = JSON.parse(v.sources || "[]");
    if (!Array.isArray(sources)) throw new Error();
  } catch {
    return { error: "Bronnen moeten een JSON-lijst zijn: [{\"title\":\"…\",\"url\":\"https://…\",\"accessed\":\"2026-10-31\"}]" };
  }
  const supabase = await createClient();
  const { data: existing } = v.id ? await supabase.from("articles").select("status, published_at").eq("id", v.id).maybeSingle() : { data: null };
  const row = {
    slug: v.slug, title: v.title, excerpt: v.excerpt, body: v.body, kind: v.kind, author_id: v.author_id, category_id: v.category_id ?? null, status: v.status,
    seo_title: v.seo_title || null, seo_description: v.seo_description || null, sources,
    related_slugs: v.related_slugs.split(",").map((s) => s.trim()).filter(Boolean),
    reviewed_at: v.reviewed_at ?? null,
    published_at: v.status === "gepubliceerd" ? existing?.published_at ?? new Date().toISOString() : existing?.published_at ?? null,
  };
  const { data, error } = v.id
    ? await supabase.from("articles").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("articles").insert(row).select("id").single();
  if (error) return { error: errorMessage(error) };
  revalidatePath("/kennisbank");
  revalidatePath(`/kennisbank/${v.slug}`);
  revalidatePath("/beheer/kennisbank");
  if (!v.id) redirect(`/beheer/kennisbank/${data.id}`);
  return { ok: true, message: "Artikel opgeslagen." };
}
