"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/errors";
import { placeSlug } from "@/lib/data";
import type { FormState } from "@/components/forms";

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}
const optInt = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().min(min).max(max).nullable());

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Vul een naam in.").max(60),
  headline: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(3000).default(""),
  skills: z.string().max(600).default(""),
  languages: z.array(z.string().regex(/^[a-z]{2}$/)).max(10).default(["nl"]),
  experience_years: optInt(0, 70),
  hourly_rate: optInt(0, 1000),
  place_slug: z.string().trim().optional(),
  works_on_location: z.enum(["on"]).optional(),
  works_online: z.enum(["on"]).optional(),
  travel_radius_km: z.coerce.number().int().min(0).max(300).default(25),
  provider_type: z.enum(["particulier", "zakelijk"]),
  company_name: z.string().trim().max(120).default(""),
  is_provider: z.enum(["on"]).optional(),
  availability: z.enum(["beschikbaar", "beperkt", "niet_beschikbaar"]),
  available_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  availability_note: z.string().trim().max(200).default(""),
});

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const raw = { ...Object.fromEntries(formData), languages: formData.getAll("languages") };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer je gegevens." };
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  const v = parsed.data;
  let place_id: number | null = null;
  if (v.place_slug) {
    const { data } = await supabase.from("places").select("id").eq("slug", placeSlug(v.place_slug) ?? "").maybeSingle();
    if (!data) return { error: "Kies je woonplaats uit de lijst." };
    place_id = data.id;
  }
  const skills = [...new Set(v.skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 20).map((s) => s.slice(0, 40));
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: v.display_name,
      headline: v.headline,
      bio: v.bio,
      skills,
      languages: v.languages.length ? v.languages : ["nl"],
      experience_years: v.experience_years,
      hourly_rate_cents: v.hourly_rate === null ? null : Math.round(v.hourly_rate * 100),
      place_id,
      works_on_location: v.works_on_location === "on",
      works_online: v.works_online === "on",
      travel_radius_km: v.travel_radius_km,
      provider_type: v.provider_type,
      company_name: v.provider_type === "zakelijk" ? v.company_name || null : null,
      is_provider: v.is_provider === "on",
      availability: v.availability,
      available_from: v.available_from ?? null,
      availability_note: v.availability_note,
    })
    .eq("id", user.id);
  if (error) return { error: errorMessage(error) };
  revalidatePath("/account/profiel");
  return { ok: true, message: "Profiel opgeslagen." };
}

export async function updateCategories(_: FormState, formData: FormData): Promise<FormState> {
  const ids = formData.getAll("categorie").map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length > 10) return { error: "Kies maximaal 10 categorieën." };
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  const { data: current } = await supabase.from("profile_categories").select("category_id").eq("profile_id", user.id);
  const have = new Set((current ?? []).map((c) => c.category_id as number));
  const want = new Set(ids);
  const remove = [...have].filter((x) => !want.has(x));
  const add = [...want].filter((x) => !have.has(x));
  if (remove.length) await supabase.from("profile_categories").delete().eq("profile_id", user.id).in("category_id", remove);
  if (add.length) {
    const { error } = await supabase.from("profile_categories").insert(add.map((category_id) => ({ profile_id: user.id, category_id })));
    if (error) return { error: errorMessage(error) };
  }
  revalidatePath("/account/profiel");
  return { ok: true, message: "Categorieën opgeslagen." };
}

export async function setAvatar(path: string | null) {
  const { supabase, user } = await userClient();
  if (!user || (path && !path.startsWith(`${user.id}/`))) return { error: "Niet toegestaan." };
  const { data: old } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (old?.avatar_path && old.avatar_path !== path) await supabase.storage.from("avatars").remove([old.avatar_path]);
  revalidatePath("/account/profiel");
  return { ok: true };
}

const portfolioSchema = z.object({
  title: z.string().trim().min(2, "Geef het werk een titel.").max(100),
  description: z.string().trim().max(1000).default(""),
  image_path: z.string().optional().or(z.literal("").transform(() => undefined)),
  video_url: z
    .string()
    .trim()
    .regex(/^https:\/\/(www\.)?(youtube\.com\/watch\?v=[A-Za-z0-9_-]{6,}|youtu\.be\/[A-Za-z0-9_-]{6,}|vimeo\.com\/[0-9]{5,})/, "Alleen links naar YouTube of Vimeo.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function addPortfolioItem(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = portfolioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  if (!v.image_path && !v.video_url) return { error: "Voeg een foto of een videolink toe." };
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  if (v.image_path && !v.image_path.startsWith(`${user.id}/`)) return { error: "Ongeldige afbeelding." };
  const { error } = await supabase.from("portfolio_items").insert({ profile_id: user.id, title: v.title, description: v.description, image_path: v.image_path ?? null, video_url: v.video_url ?? null });
  if (error) return { error: errorMessage(error) };
  revalidatePath("/account/profiel");
  return { ok: true, message: "Toegevoegd aan je portfolio." };
}

export async function deletePortfolioItem(formData: FormData) {
  const { supabase, user } = await userClient();
  if (!user) return;
  const { data } = await supabase.from("portfolio_items").delete().eq("id", String(formData.get("id"))).eq("profile_id", user.id).select("image_path").maybeSingle();
  if (data?.image_path) await supabase.storage.from("portfolio").remove([data.image_path]);
  revalidatePath("/account/profiel");
}

const serviceSchema = z.object({
  category_id: z.coerce.number().int().positive("Kies een categorie."),
  title: z.string().trim().min(8, "Titel: minimaal 8 tekens.").max(90),
  description: z.string().trim().min(40, "Beschrijving: minimaal 40 tekens.").max(5000),
  price_type: z.enum(["vast", "uur", "vanaf", "op_aanvraag"]),
  price: optInt(1, 100000),
  delivery_note: z.string().trim().max(120).default(""),
  work_mode: z.enum(["op_locatie", "online", "beide"]),
});

const packageSchema = z.object({
  name: z.string().trim().min(2, "Pakket: geef elk pakket een naam.").max(40),
  price: optInt(1, 100000).refine((n) => n !== null, "Pakket: vul bij elk pakket een prijs in."),
  description: z.string().trim().max(300).default(""),
  delivery: z.string().trim().max(60).default(""),
});

/** Pakketten uit pkg_<veld>_<0..2>; lege rijen tellen niet mee. */
function readPackages(formData: FormData) {
  const rows = [0, 1, 2]
    .map((i) => ({
      name: String(formData.get(`pkg_name_${i}`) ?? ""),
      price: String(formData.get(`pkg_price_${i}`) ?? ""),
      description: String(formData.get(`pkg_desc_${i}`) ?? ""),
      delivery: String(formData.get(`pkg_delivery_${i}`) ?? ""),
    }))
    .filter((r) => r.name.trim() || r.price.trim());
  const out: { name: string; price_cents: number; description: string; delivery: string }[] = [];
  for (const r of rows) {
    const p = packageSchema.safeParse(r);
    if (!p.success) return { error: p.error.issues[0].message };
    out.push({ name: p.data.name, price_cents: Math.round((p.data.price ?? 0) * 100), description: p.data.description, delivery: p.data.delivery });
  }
  return { packages: out };
}

export async function addService(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const pk = readPackages(formData);
  if ("error" in pk) return { error: pk.error };
  const usePackages = pk.packages.length > 0;
  if (!usePackages && v.price_type !== "op_aanvraag" && v.price === null) return { error: "Vul een prijs in, kies ‘op aanvraag’ of maak pakketten." };
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  const cover = String(formData.get("cover_path") ?? "") || null;
  if (cover && !cover.startsWith(`${user.id}/`)) return { error: "Die omslagfoto hoort niet bij jouw account." };
  // met pakketten is de dienstprijs 'vanaf' het goedkoopste pakket
  const priceType = usePackages ? (pk.packages.length > 1 ? "vanaf" : "vast") : v.price_type;
  const priceCents = usePackages ? Math.min(...pk.packages.map((p) => p.price_cents)) : v.price_type === "op_aanvraag" ? null : Math.round((v.price ?? 0) * 100);
  const slug = `${v.title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${crypto.randomUUID().slice(0, 6)}`;
  const { error } = await supabase.from("services").insert({
    provider_id: user.id, category_id: v.category_id, slug, title: v.title, description: v.description, price_type: priceType,
    price_cents: priceCents, delivery_note: v.delivery_note, work_mode: v.work_mode, status: "actief", cover_path: cover, packages: pk.packages,
  });
  if (error) return { error: errorMessage(error) };
  revalidatePath("/account/profiel");
  return { ok: true, message: "Dienst gepubliceerd." };
}

export async function setServiceStatus(formData: FormData) {
  const { supabase, user } = await userClient();
  if (!user) return;
  const status = String(formData.get("status"));
  if (!["actief", "gepauzeerd", "verwijderd"].includes(status)) return;
  await supabase.from("services").update({ status }).eq("id", String(formData.get("id"))).eq("provider_id", user.id);
  revalidatePath("/account/profiel");
}

export async function requestKvkCheck(_: FormState, formData: FormData): Promise<FormState> {
  const kvk = String(formData.get("kvk") ?? "").replace(/\s/g, "");
  if (!/^[0-9]{8}$/.test(kvk)) return { error: "Een KVK-nummer heeft 8 cijfers." };
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  const { error } = await supabase.from("verifications").insert({ profile_id: user.id, kind: "kvk", reference: kvk });
  if (error) return { error: errorMessage(error) };
  revalidatePath("/account/profiel");
  return { ok: true, message: "Ontvangen. We controleren je inschrijving handmatig in het KVK-register." };
}

// ── Meldingen ────────────────────────────────────────────────────────────

export async function markAllNotificationsRead() {
  const { supabase, user } = await userClient();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/account/meldingen");
  revalidatePath("/", "layout");
}

// ── Privacy en toestemming ───────────────────────────────────────────────

export async function updatePrivacy(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  const show_age = formData.get("show_age") === "on";
  const marketing = formData.get("marketing") === "on";
  const { error } = await supabase.from("profiles").update({ show_age }).eq("id", user.id);
  if (error) return { error: errorMessage(error) };
  await supabase.from("profile_private").update({ marketing_opt_in: marketing }).eq("id", user.id);
  revalidatePath("/account/instellingen");
  return { ok: true, message: "Opgeslagen." };
}

export async function requestGuardianConsent(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await userClient();
  const { error } = await supabase.rpc("request_guardian_consent", { p_guardian_email: String(formData.get("email") ?? "").trim() });
  if (error) return { error: errorMessage(error) };
  revalidatePath("/account/instellingen");
  return { ok: true, message: "We hebben je ouder of voogd een link gestuurd. Zodra die bevestigt, krijg je een melding." };
}

export async function revokeGuardianConsent() {
  const { supabase } = await userClient();
  await supabase.rpc("revoke_guardian_consent");
  revalidatePath("/account/instellingen");
}

export async function confirmGuardianConsent(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await userClient();
  const { data, error } = await supabase.rpc("confirm_guardian_consent", { p_token: String(formData.get("token") ?? ""), p_guardian_name: String(formData.get("naam") ?? "") });
  if (error) return { error: errorMessage(error) };
  if (!data) return { error: "Deze link is ongeldig of al gebruikt." };
  return { ok: true, message: "Dank u wel. De toestemming is vastgelegd. U kunt deze pagina sluiten." };
}

export async function submitAppeal(_: FormState, formData: FormData): Promise<FormState> {
  const details = String(formData.get("details") ?? "").trim();
  if (details.length < 20) return { error: "Leg in minimaal 20 tekens uit waarom je het niet eens bent met het besluit." };
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  const { error } = await supabase.from("reports").insert({ target_type: "bezwaar", target_id: user.id, reason: "bezwaar", details: details.slice(0, 2000) });
  if (error) return { error: errorMessage(error) };
  revalidatePath("/account/meldingen-en-bezwaar");
  return { ok: true, message: "Je bezwaar is ontvangen. Iemand die niet bij het eerste besluit betrokken was, kijkt ernaar." };
}
