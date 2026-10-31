import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { signUp } from "@/actions/auth";
import { getMe, safeNext } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = {
  title: "Account maken",
  description: "Maak gratis een Jobmarkt-account. Eén account om opdrachten te plaatsen én als professional te werken.",
  alternates: { canonical: "/aanmelden" },
};

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ volgende?: string; rol?: string }> }) {
  const { volgende, rol } = await searchParams;
  const next = safeNext(volgende);
  if (await getMe()) redirect(next);
  const isPro = rol === "professional";
  return (
    <AuthShell
      title={isPro ? "Aanmelden als professional" : "Account maken"}
      intro={<>Heb je al een account? <Link className="link" href={`/inloggen?volgende=${encodeURIComponent(next)}`}>Log in</Link>.</>}
      aside={
        <>
          <p className="font-semibold text-ink">Eén account voor alles</p>
          <ul className="mt-3 space-y-2">
            {["Opdrachten plaatsen is gratis", "Ook werken als professional, zonder tweede account", "Je telefoonnummer en adres zijn nooit openbaar", "Jobmarkt is voor iedereen van 16 jaar en ouder"].map((t) => (
              <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />{t}</li>
            ))}
          </ul>
        </>
      }
    >
      <ActionForm action={signUp} className="space-y-4">
        <input type="hidden" name="volgende" value={next} />
        {rol && <input type="hidden" name="rol" value={rol} />}
        <div>
          <label htmlFor="display_name" className="label">Je naam</label>
          <input id="display_name" name="display_name" autoComplete="name" required minLength={2} maxLength={60} className="input" aria-describedby="name-hint" />
          <p id="name-hint" className="hint">Zo zien anderen je. Je mag ook alleen je voornaam gebruiken.</p>
        </div>
        <div>
          <label htmlFor="email" className="label">E-mailadres</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">Wachtwoord</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" aria-describedby="pw-hint" />
          <p id="pw-hint" className="hint">Minimaal 8 tekens.</p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="akkoord" value="ja" required className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
          <span>Ik ga akkoord met de <Link href="/voorwaarden" className="link">voorwaarden</Link> en <Link href="/communityregels" className="link">communityregels</Link>, en heb de <Link href="/privacy" className="link">privacyverklaring</Link> gelezen.</span>
        </label>
        <SubmitButton className="btn-primary w-full">Account maken</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
