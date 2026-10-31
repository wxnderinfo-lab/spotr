import type { Metadata } from "next";
import { requestPasswordReset } from "@/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Wachtwoord vergeten", robots: { index: false, follow: true } };

export default function ForgotPage() {
  return (
    <AuthShell title="Wachtwoord vergeten" intro="Vul je e-mailadres in. Je krijgt een link om een nieuw wachtwoord te kiezen.">
      <ActionForm action={requestPasswordReset} hideOnSuccess className="space-y-4">
        <div>
          <label htmlFor="email" className="label">E-mailadres</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full">Stuur link</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
