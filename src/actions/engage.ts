"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/errors";
import type { FormState } from "@/components/forms";

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveSearch(kind: "opdrachten" | "professionals", params: Record<string, unknown>, notify: boolean): Promise<FormState> {
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log in om zoekopdrachten op te slaan." };
  const clean = Object.fromEntries(Object.entries(params).filter(([k, v]) => k !== "pagina" && v !== undefined && v !== ""));
  const name = [clean.q, clean.categorie, clean.plaats].filter(Boolean).join(" · ").slice(0, 80) || (kind === "opdrachten" ? "Opdrachten" : "Professionals");
  const { error } = await supabase.from("saved_searches").insert({ user_id: user.id, kind, name, params: clean, notify });
  if (error) return { error: notify ? "Meldingen bij nieuwe opdrachten horen bij Pro. Je kunt de zoekopdracht wel zonder meldingen opslaan." : errorMessage(error) };
  revalidatePath("/account/favorieten");
  return { ok: true, message: "Zoekopdracht opgeslagen." };
}

export async function deleteSavedSearch(formData: FormData) {
  const { supabase, user } = await userClient();
  if (!user) return;
  await supabase.from("saved_searches").delete().eq("id", String(formData.get("id"))).eq("user_id", user.id);
  revalidatePath("/account/favorieten");
}

export async function toggleSavedSearchNotify(formData: FormData) {
  const { supabase, user } = await userClient();
  if (!user) return;
  await supabase.from("saved_searches").update({ notify: formData.get("notify") === "1" }).eq("id", String(formData.get("id"))).eq("user_id", user.id);
  revalidatePath("/account/favorieten");
}

const favSchema = z.object({ type: z.enum(["professional", "opdracht", "dienst"]), id: z.string().uuid(), on: z.enum(["0", "1"]), pad: z.string().startsWith("/") });

export async function toggleFavorite(formData: FormData) {
  const parsed = favSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { supabase, user } = await userClient();
  if (!user) return;
  const { type, id, on, pad } = parsed.data;
  if (on === "1") await supabase.from("favorites").insert({ user_id: user.id, target_type: type, target_id: id });
  else await supabase.from("favorites").delete().match({ user_id: user.id, target_type: type, target_id: id });
  revalidatePath(pad);
  revalidatePath("/account/favorieten");
}

const reportSchema = z.object({
  target_type: z.enum(["opdracht", "profiel", "dienst", "bericht", "beoordeling", "vraag", "bezwaar"]),
  target_id: z.string().uuid(),
  reason: z.enum(["spam", "oplichting", "verboden_dienst", "ongepast", "contactgegevens", "nep_beoordeling", "minderjarige", "intimidatie", "anders", "bezwaar"]),
  details: z.string().trim().max(2000).default(""),
});

export async function submitReport(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Kies een reden." };
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log in om te melden. Zo kunnen we je laten weten wat we met je melding doen." };
  const { error } = await supabase.from("reports").insert(parsed.data);
  if (error) return { error: errorMessage(error) };
  return { ok: true, message: "Bedankt. We bekijken je melding en laten je weten wat we besluiten." };
}

export async function blockUser(formData: FormData) {
  const { supabase, user } = await userClient();
  const id = String(formData.get("id"));
  if (!user || !z.string().uuid().safeParse(id).success) return;
  if (formData.get("on") === "1") await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: id });
  else await supabase.from("blocks").delete().match({ blocker_id: user.id, blocked_id: id });
  revalidatePath(String(formData.get("pad") ?? "/account"));
}
