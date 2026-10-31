import Link from "next/link";
import type { Metadata } from "next";
import { setNewPassword } from "@/actions/auth";
import { getMe } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Nieuw wachtwoord", robots: { index: false } };

export default async function SetPasswordPage() {
  const me = await getMe();
  if (!me) {
    return (
      <AuthShell title="Link verlopen" intro="Deze link werkt niet meer. Vraag een nieuwe aan.">
        <Link href="/wachtwoord-vergeten" className="btn-primary">Nieuwe link aanvragen</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Kies een nieuw wachtwoord">
      <ActionForm action={setNewPassword} className="space-y-4">
        <div>
          <label htmlFor="password" className="label">Nieuw wachtwoord</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
        <div>
          <label htmlFor="herhaal" className="label">Herhaal wachtwoord</label>
          <input id="herhaal" name="herhaal" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full">Opslaan</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
