import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMe, safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/AuthShell";
import { OnboardingForm } from "@/components/OnboardingForm";

export const metadata: Metadata = { title: "Welkom", robots: { index: false } };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ volgende?: string; rol?: string }> }) {
  const { volgende, rol } = await searchParams;
  const me = await requireMe("/welkom", { onboarded: false });
  if (me.status.onboarded) redirect(safeNext(volgende));
  const supabase = await createClient();
  const { data: priv } = await supabase.from("profile_private").select("birthdate").eq("id", me.id).maybeSingle();
  const suggestion = (me.profile.display_name || me.email.split("@")[0]).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "profiel";
  return (
    <AuthShell
      title="Welkom bij Jobmarkt"
      intro="Nog drie dingen, dan kun je beginnen."
      aside={
        <>
          <p className="font-semibold text-ink">Waarom je geboortedatum?</p>
          <p className="mt-2">Jobmarkt is voor mensen van 16 jaar en ouder. Ben je 16 of 17, dan heb je voor opdrachten toestemming van een ouder of voogd nodig, en sommige categorieën zijn 18+.</p>
          <p className="mt-2">Je geboortedatum is <strong>nooit openbaar</strong>. Volwassenen kunnen later zelf kiezen of hun leeftijd op het profiel staat.</p>
        </>
      }
    >
      <OnboardingForm displayName={me.profile.display_name} usernameSuggestion={suggestion} defaultRole={rol === "professional" ? "professional" : "opdrachtgever"} next={volgende ?? ""} birthdate={priv?.birthdate ?? null} />
    </AuthShell>
  );
}
