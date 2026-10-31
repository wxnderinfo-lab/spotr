"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/errors";
import type { FormState } from "@/components/forms";

export async function sharePhone(_: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("share_phone", { p_conversation: id, p_phone: String(formData.get("phone") ?? "") });
  if (error) return { error: errorMessage(error) };
  revalidatePath(`/berichten/${id}`);
  return { ok: true, message: "Nummer gedeeld." };
}

export async function revokePhone(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.rpc("revoke_phone", { p_conversation: id });
  revalidatePath(`/berichten/${id}`);
}

/** Kortlevende link naar een privébijlage; de opslag controleert of je deelnemer bent. */
export async function attachmentUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 60);
  if (error || !data) return null;
  return data.signedUrl;
}
