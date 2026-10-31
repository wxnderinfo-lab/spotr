import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn } from "@/actions/auth";
import { getMe, safeNext } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Inloggen", robots: { index: false, follow: true }, alternates: { canonical: "/inloggen" } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ volgende?: string }> }) {
  const { volgende } = await searchParams;
  const next = safeNext(volgende);
  if (await getMe()) redirect(next);
  return (
    <AuthShell title="Inloggen" intro={<>Nog geen account? <Link className="link" href={`/aanmelden?volgende=${encodeURIComponent(next)}`}>Maak er gratis een</Link>.</>}>
      <ActionForm action={signIn} className="space-y-4">
        <input type="hidden" name="volgende" value={next} />
        <div>
          <label htmlFor="email" className="label">E-mailadres</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label">Wachtwoord</label>
            <Link href="/wachtwoord-vergeten" className="link text-sm">Vergeten?</Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full">Inloggen</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
