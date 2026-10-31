import type { Metadata } from "next";
import { resendConfirmation } from "@/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Bevestig je e-mailadres", robots: { index: false } };

export default async function CheckMailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthShell
      title="Bevestig je e-mailadres"
      intro={<>We hebben een link gestuurd naar <strong>{email ?? "je e-mailadres"}</strong>. Klik erop om je account te activeren. Je begonnen opdracht blijft in deze browser bewaard.</>}
    >
      <p className="text-sm text-muted">Geen mail gezien? Kijk in je spam of vraag een nieuwe link aan.</p>
      <ActionForm action={resendConfirmation} className="mt-4 flex gap-2">
        <input type="hidden" name="email" value={email ?? ""} />
        <SubmitButton className="btn-secondary">Stuur opnieuw</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
