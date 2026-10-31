"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/errors";
import type { FormState } from "@/components/forms";

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

const euroToCents = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

// ── Opdracht plaatsen ────────────────────────────────────────────────────

const jobSchema = z
  .object({
    category_id: z.coerce.number().int().positive({ message: "Kies een categorie." }),
    title: z.string().trim().min(8, "Maak de titel iets duidelijker (minimaal 8 tekens).").max(90, "Houd de titel korter dan 90 tekens."),
    description: z.string().trim().min(30, "Beschrijf de opdracht in minimaal 30 tekens.").max(5000),
    work_mode: z.enum(["op_locatie", "online"]),
    place_slug: z.string().trim().optional(),
    budget_type: z.enum(["vast", "uur", "in_overleg"]),
    budget_min: z.preprocess(euroToCents, z.number().int().min(0).max(10_000_000).nullable()),
    budget_max: z.preprocess(euroToCents, z.number().int().min(0).max(10_000_000).nullable()),
    timing: z.enum(["zo_snel_mogelijk", "voor_datum", "op_datum", "flexibel"]),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
    answers: z.record(z.string(), z.string().max(300)).default({}),
  })
  .superRefine((v, ctx) => {
    if (v.work_mode === "op_locatie" && !v.place_slug) ctx.addIssue({ code: "custom", path: ["place_slug"], message: "Kies de plaats waar het werk is." });
    if (v.budget_type !== "in_overleg" && v.budget_min === null && v.budget_max === null)
      ctx.addIssue({ code: "custom", path: ["budget_max"], message: "Vul een bedrag in of kies ‘in overleg’." });
    if (v.budget_min !== null && v.budget_max !== null && v.budget_max < v.budget_min)
      ctx.addIssue({ code: "custom", path: ["budget_max"], message: "Het maximum is lager dan het minimum." });
    if ((v.timing === "voor_datum" || v.timing === "op_datum") && !v.due_date) ctx.addIssue({ code: "custom", path: ["due_date"], message: "Kies een datum." });
    if (v.due_date && v.due_date < new Date().toISOString().slice(0, 10)) ctx.addIssue({ code: "custom", path: ["due_date"], message: "Die datum ligt in het verleden." });
  });

export type JobInput = z.input<typeof jobSchema>;

/** Slaat de opdracht op als concept (nog niet openbaar) en gaat naar de controlestap. */
export async function saveJobDraft(input: JobInput & { id?: string }): Promise<FormState & { id?: string }> {
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Controleer de gemarkeerde velden.", fieldErrors };
  }
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log in om je opdracht op te slaan." };
  const v = parsed.data;
  let place_id: number | null = null;
  if (v.work_mode === "op_locatie") {
    const { data: place } = await supabase.from("places").select("id").eq("slug", v.place_slug!).maybeSingle();
    if (!place) return { error: "Controleer de gemarkeerde velden.", fieldErrors: { place_slug: "Deze plaats kennen we niet. Kies er een uit de lijst." } };
    place_id = place.id;
  }
  const row = {
    category_id: v.category_id,
    title: v.title,
    description: v.description,
    work_mode: v.work_mode,
    place_id,
    budget_type: v.budget_type,
    budget_min_cents: v.budget_type === "in_overleg" ? null : v.budget_min,
    budget_max_cents: v.budget_type === "in_overleg" ? null : v.budget_max,
    timing: v.timing,
    due_date: v.due_date ?? null,
    answers: v.answers,
  };
  if (input.id) {
    const { error } = await supabase.from("jobs").update(row).eq("id", input.id).eq("client_id", user.id).eq("status", "concept");
    if (error) return { error: errorMessage(error) };
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabase.from("jobs").insert({ ...row, client_id: user.id }).select("id").single();
  if (error) return { error: errorMessage(error) };
  return { ok: true, id: data.id };
}

export async function publishJob(_: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id"));
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  const { data, error } = await supabase.rpc("publish_job", { p_job: id });
  if (error) return { error: errorMessage(error) };
  revalidatePath("/opdrachten");
  revalidatePath("/");
  redirect(`/account/opdrachten/${id}?${data === "in_beoordeling" ? "gecontroleerd=1" : "geplaatst=1"}`);
}

export async function deleteDraft(formData: FormData) {
  const { supabase } = await userClient();
  await supabase.rpc("transition_job", { p_job: String(formData.get("id")), p_to: "verwijderd", p_note: null });
  redirect("/account/opdrachten");
}

export async function transitionJob(_: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id"));
  const to = String(formData.get("to"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  const { error } = await supabase.rpc("transition_job", { p_job: id, p_to: to, p_note: note });
  if (error) return { error: errorMessage(error) };
  revalidatePath(`/account/opdrachten/${id}`);
  revalidatePath("/account/opdrachten");
  return { ok: true, message: "Status bijgewerkt." };
}

// ── Vragen ───────────────────────────────────────────────────────────────

export async function askQuestion(_: FormState, formData: FormData): Promise<FormState> {
  const job = String(formData.get("job"));
  const question = String(formData.get("question") ?? "").trim();
  if (question.length < 5) return { error: "Je vraag is te kort." };
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log in om een vraag te stellen." };
  const { error } = await supabase.rpc("ask_question", { p_job: job, p_question: question });
  if (error) return { error: errorMessage(error) };
  revalidatePath(String(formData.get("pad") ?? "/opdrachten"));
  return { ok: true, message: "Je vraag is geplaatst. De opdrachtgever krijgt een melding." };
}

export async function answerQuestion(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await userClient();
  const { error } = await supabase.rpc("answer_question", { p_question: String(formData.get("id")), p_answer: String(formData.get("answer") ?? "") });
  if (error) return { error: errorMessage(error) };
  revalidatePath(String(formData.get("pad") ?? "/opdrachten"));
  return { ok: true, message: "Antwoord geplaatst." };
}

// ── Voorstellen ──────────────────────────────────────────────────────────

const proposalSchema = z
  .object({
    job: z.string().uuid(),
    price_type: z.enum(["vast", "uur"]),
    amount: z.preprocess(euroToCents, z.number({ message: "Vul een bedrag in." }).int().min(100, "Minimaal € 1.").max(10_000_000)),
    hours: z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().min(0.5).max(2000).nullable()),
    message: z.string().trim().min(30, "Vertel in minimaal 30 tekens waarom jij deze opdracht goed kunt doen.").max(3000),
    planning: z.string().trim().max(600).default(""),
    available_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  });

export async function submitProposal(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = proposalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Controleer je voorstel.", fieldErrors };
  }
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log in om een voorstel te sturen." };
  const v = parsed.data;
  const portfolio = formData.getAll("portfolio").map(String).filter((x) => z.string().uuid().safeParse(x).success).slice(0, 6);
  const { error } = await supabase.rpc("submit_proposal", {
    p_job: v.job,
    p_price_type: v.price_type,
    p_amount_cents: v.amount,
    p_estimated_hours: v.price_type === "uur" ? v.hours : null,
    p_message: v.message,
    p_planning: v.planning,
    p_available_from: v.available_from ?? null,
    p_portfolio_item_ids: portfolio,
  });
  if (error) return { error: errorMessage(error) };
  revalidatePath(String(formData.get("pad") ?? "/opdrachten"));
  revalidatePath("/account/voorstellen");
  return { ok: true, message: "Je voorstel is verstuurd. Je krijgt een melding zodra de opdrachtgever kiest." };
}

export async function withdrawProposal(formData: FormData) {
  const { supabase } = await userClient();
  await supabase.rpc("withdraw_proposal", { p_proposal: String(formData.get("id")) });
  revalidatePath("/account/voorstellen");
}

export async function declineProposal(formData: FormData) {
  const { supabase } = await userClient();
  await supabase.rpc("decline_proposal", { p_proposal: String(formData.get("id")) });
  revalidatePath(`/account/opdrachten/${String(formData.get("job"))}`);
}

export async function acceptProposal(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await userClient();
  if (!user) return { error: "Log eerst in." };
  const { data, error } = await supabase.rpc("accept_proposal", { p_proposal: String(formData.get("id")) });
  if (error) return { error: errorMessage(error) };
  revalidatePath("/account/opdrachten");
  redirect(`/berichten/${data}`);
}

// ── Beoordelen ───────────────────────────────────────────────────────────

const reviewSchema = z.object({
  job: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Geef een algemeen oordeel.").max(5),
  communication: z.coerce.number().int().min(1).max(5).optional().or(z.literal("").transform(() => undefined)),
  quality: z.coerce.number().int().min(1).max(5).optional().or(z.literal("").transform(() => undefined)),
  reliability: z.coerce.number().int().min(1).max(5).optional().or(z.literal("").transform(() => undefined)),
  body: z.string().trim().max(2000).default(""),
});

export async function submitReview(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer je beoordeling." };
  const { supabase } = await userClient();
  const v = parsed.data;
  const { error } = await supabase.rpc("submit_review", {
    p_job: v.job, p_rating: v.rating, p_communication: v.communication ?? null, p_quality: v.quality ?? null, p_reliability: v.reliability ?? null, p_body: v.body,
  });
  if (error) return { error: errorMessage(error) };
  revalidatePath(`/account/opdrachten/${v.job}`);
  revalidatePath("/account/beoordelingen");
  return { ok: true, message: "Bedankt! Je beoordeling wordt zichtbaar zodra de ander ook heeft beoordeeld, of uiterlijk na 14 dagen." };
}

export async function respondToReview(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await userClient();
  const { error } = await supabase.rpc("respond_to_review", { p_review: String(formData.get("id")), p_response: String(formData.get("response") ?? "") });
  if (error) return { error: errorMessage(error) };
  revalidatePath("/account/beoordelingen");
  return { ok: true, message: "Je reactie staat bij de beoordeling." };
}

// ── Foto's bij een opdracht ──────────────────────────────────────────────

export async function addJobAttachment(jobId: string, path: string) {
  const { supabase, user } = await userClient();
  if (!user || !path.startsWith(`${user.id}/`)) return { error: "Niet toegestaan." };
  const { error } = await supabase.from("job_attachments").insert({ job_id: jobId, owner_id: user.id, path });
  if (error) {
    await supabase.storage.from("job-media").remove([path]);
    return { error: errorMessage(error) };
  }
  revalidatePath(`/account/opdrachten/${jobId}`);
  return { ok: true };
}

export async function removeJobAttachment(formData: FormData) {
  const { supabase, user } = await userClient();
  if (!user) return;
  const { data } = await supabase.from("job_attachments").delete().eq("id", String(formData.get("id"))).eq("owner_id", user.id).select("path, job_id").maybeSingle();
  if (data) {
    await supabase.storage.from("job-media").remove([data.path]);
    revalidatePath(`/account/opdrachten/${data.job_id}`);
  }
}
