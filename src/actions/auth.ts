"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { site } from "@/config/site";
import { errorMessage } from "@/lib/errors";
import type { FormState } from "@/components/forms";

const email = z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in.");
const password = z.string().min(8, "Kies een wachtwoord van minimaal 8 tekens.").max(72);

function authError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "E-mailadres of wachtwoord klopt niet.";
  if (/email not confirmed/i.test(msg)) return "Bevestig eerst je e-mailadres via de link in je mail.";
  if (/rate limit|too many/i.test(msg)) return "Te veel pogingen. Wacht even en probeer het opnieuw.";
  if (/weak|password should/i.test(msg)) return "Kies een sterker wachtwoord van minimaal 8 tekens.";
  return "Dat lukte niet. Probeer het opnieuw.";
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1, "Vul je wachtwoord in.") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authError(error.message) };
  redirect(safeNext(String(formData.get("volgende") ?? ""), "/account"));
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email, password, display_name: z.string().trim().min(2, "Vul je naam in.").max(60), akkoord: z.literal("ja", { message: "Ga akkoord met de voorwaarden om verder te gaan." }) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const next = safeNext(String(formData.get("volgende") ?? ""), "/account");
  const rol = String(formData.get("rol") ?? "");
  const welcome = `/welkom?volgende=${encodeURIComponent(next)}${rol ? `&rol=${encodeURIComponent(rol)}` : ""}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.display_name }, emailRedirectTo: `${site.url}${welcome}` },
  });
  if (error) return { error: authError(error.message) };
  if (data.session) redirect(welcome);
  redirect(`/aanmelden/controleer-je-mail?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function resendConfirmation(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Vul een geldig e-mailadres in." };
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email: parsed.data });
  return { ok: true, message: "Als dit adres bij ons bekend is en nog niet bevestigd, sturen we een nieuwe link." };
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Vul een geldig e-mailadres in." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${site.url}/wachtwoord-instellen` });
  // altijd dezelfde melding: we verklappen niet of een adres bestaat
  return { ok: true, message: "Als er een account bij dit adres hoort, ontvang je binnen een paar minuten een link om een nieuw wachtwoord te kiezen." };
}

export async function setNewPassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ password, herhaal: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.password !== parsed.data.herhaal) return { error: "De wachtwoorden zijn niet hetzelfde." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Je link is verlopen. Vraag een nieuwe aan." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authError(error.message) };
  redirect("/account?wachtwoord=gewijzigd");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const onboardingSchema = z.object({
  display_name: z.string().trim().min(2, "Vul een naam in van minimaal 2 tekens.").max(60),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "Gebruik 3 tot 40 kleine letters, cijfers of streepjes."),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vul je geboortedatum in."),
  rol: z.enum(["opdrachtgever", "professional", "beide"]),
  akkoord: z.literal("ja", { message: "Ga akkoord met de voorwaarden en communityregels." }),
});

export async function completeOnboarding(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Controleer de gemarkeerde velden.", fieldErrors };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_birthdate: v.birthdate,
    p_display_name: v.display_name,
    p_username: v.username,
    p_is_provider: v.rol !== "opdrachtgever",
    p_terms_version: site.termsVersion,
  });
  if (error) {
    const msg = errorMessage(error);
    return { error: msg, fieldErrors: error.message.includes("gebruikersnaam") ? { username: msg } : error.message.includes("jong") || error.message.includes("geboorte") ? { birthdate: msg } : undefined };
  }
  const next = safeNext(String(formData.get("volgende") ?? ""), v.rol === "opdrachtgever" ? "/account" : "/account/profiel?nieuw=1");
  if ((data as { age_group: string }).age_group === "minderjarig") redirect(`/account/instellingen?minderjarig=1#toestemming`);
  redirect(next === "/account" && v.rol !== "opdrachtgever" ? "/account/profiel?nieuw=1" : next);
}
