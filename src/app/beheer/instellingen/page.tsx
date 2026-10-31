import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { billingEnabled, isTestMode } from "@/lib/billing";
import { timeAgo } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { setSetting } from "@/actions/admin";

export const metadata = { title: "Instellingen" };

export default async function AdminSettings() {
  const me = await getMe();
  if (!me?.status.is_admin) redirect("/beheer");
  const supabase = await createClient();
  const [{ data: settings }, { data: outbox }, { count: waitlist }] = await Promise.all([
    supabase.from("app_settings").select("key, value, description, updated_at").order("key"),
    supabase.from("email_outbox").select("id, template, status, created_at, error").order("created_at", { ascending: false }).limit(20),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
  ]);
  return (
    <>
      <PageHeader title="Instellingen" intro="Wijzigingen gelden direct, worden door de database afgedwongen en komen in het auditlog. Pas prijzen op de site ook aan in src/config/pricing.ts." />
      <section className="card mb-6 p-5 text-sm">
        <p><strong>Betalen:</strong> {billingEnabled() ? (isTestMode() ? "aan (Stripe testmodus)" : "aan (LIVE)") : "uit (BILLING_ENABLED niet gezet)"}</p>
        <p className="mt-1"><strong>Wachtlijst:</strong> {waitlist ?? 0} aanmeldingen (adressen alleen via de database, niet in deze pagina).</p>
      </section>
      <ul className="space-y-4">
        {(settings ?? []).map((s) => (
          <li key={s.key} className="card p-5">
            <p className="font-mono text-sm font-semibold">{s.key}</p>
            <p className="text-sm text-muted">{s.description} · gewijzigd {timeAgo(s.updated_at)}</p>
            <ActionForm action={setSetting} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <input type="hidden" name="key" value={s.key} />
              <div className="flex-1"><label htmlFor={`v-${s.key}`} className="sr-only">Waarde</label><textarea id={`v-${s.key}`} name="value" rows={2} defaultValue={JSON.stringify(s.value)} className="input font-mono text-sm" /></div>
              <SubmitButton className="btn-secondary">Opslaan</SubmitButton>
            </ActionForm>
          </li>
        ))}
      </ul>
      <section id="email" className="mt-10">
        <h2 className="mb-3 text-lg font-bold">E-mailwachtrij (app-mails)</h2>
        <p className="mb-3 text-sm text-muted">Verstuurd door de dagelijkse taak zodra RESEND_API_KEY en EMAIL_FROM zijn ingesteld. Inloggen en bevestigen gaan via Supabase Auth.</p>
        <ul className="card divide-y divide-line text-sm">
          {(outbox ?? []).map((m) => <li key={m.id} className="flex justify-between gap-2 p-3"><span>{m.template}</span><span className="text-muted">{m.status}{m.error ? ` · ${m.error}` : ""} · {timeAgo(m.created_at)}</span></li>)}
          {!outbox?.length && <li className="p-3 text-muted">Leeg</li>}
        </ul>
      </section>
    </>
  );
}
