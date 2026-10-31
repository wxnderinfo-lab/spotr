import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountStatus = {
  onboarded: boolean;
  is_minor: boolean;
  can_contract: boolean;
  guardian_consent_status: "niet_nodig" | "aangevraagd" | "bevestigd" | "ingetrokken";
  has_pro: boolean;
  has_paid_pro: boolean;
  intro_period: boolean;
  is_admin: boolean;
  is_moderator: boolean;
  proposals_this_month: number;
  proposal_limit: number | null;
  unread_notifications: number;
  unread_messages: number;
};

export type Me = {
  id: string;
  email: string;
  profile: {
    username: string | null;
    display_name: string;
    avatar_path: string | null;
    is_provider: boolean;
  };
  status: AccountStatus;
};

/** De ingelogde gebruiker met profiel en accountstatus, of null. Eén keer per request. */
export const getMe = cache(async (): Promise<Me | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: status }] = await Promise.all([
    supabase.from("profiles").select("username, display_name, avatar_path, is_provider").eq("id", user.id).maybeSingle(),
    supabase.rpc("my_account_status"),
  ]);
  if (!profile || !status) return null;
  return { id: user.id, email: user.email ?? "", profile, status: status as AccountStatus };
});

/** Voor pagina's achter inloggen: stuurt door naar inloggen of welkom. */
export async function requireMe(next: string, { onboarded = true } = {}): Promise<Me> {
  const me = await getMe();
  if (!me) redirect(`/inloggen?volgende=${encodeURIComponent(next)}`);
  if (onboarded && !me.status.onboarded) redirect(`/welkom?volgende=${encodeURIComponent(next)}`);
  return me;
}

export async function requireModerator(next: string) {
  const me = await requireMe(next);
  if (!me.status.is_moderator) redirect("/account");
  return me;
}

/** Alleen interne paden toestaan als doorverwijzing (geen open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/account") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
