"use server";
import { z } from "zod";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import type { FormState } from "@/components/forms";

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in.").max(200),
  role: z.enum(["opdrachtgever", "professional", "beide"]),
  category: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  // honeypot: echte bezoekers laten dit leeg
  website: z.string().max(0).optional(),
});

export async function joinWaitlist(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = waitlistSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer je gegevens." };
  const { email, role, category } = parsed.data;
  const { error } = await createPublicClient().from("waitlist").insert({ email, role, category_id: category ?? null });
  if (error && !error.message.includes("duplicate")) return { error: "Aanmelden lukte niet. Probeer het later opnieuw." };
  return { ok: true, message: "Je staat op de lijst. We mailen je één keer zodra er in jouw categorie genoeg aanbod is." };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Vul je naam in.").max(100),
  email: z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in.").max(200),
  topic: z.enum(["vraag", "account", "privacy", "melding", "pers", "anders"]),
  message: z.string().trim().min(10, "Je bericht is te kort.").max(4000),
  website: z.string().max(0).optional(),
});

export async function sendContact(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer je bericht." };
  const { website: _hp, ...row } = parsed.data;
  void _hp;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("contact_messages").insert({ ...row, user_id: user?.id ?? null });
  if (error) return { error: "Versturen lukte niet. Probeer het later opnieuw." };
  return { ok: true, message: "Bedankt, je bericht is ontvangen. We reageren per e-mail." };
}
