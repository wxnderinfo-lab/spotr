import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { PageHeader, StatusBadge } from "@/components/ui";
import { setRole, setUserStatus } from "@/actions/admin";

export const metadata = { title: "Gebruikers" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await getMe();
  if (!me?.status.is_admin) redirect("/beheer");
  const { q } = await searchParams;
  const supabase = await createClient();
  const term = (q ?? "").replace(/[%,()]/g, "").trim();
  const { data: users } = term
    ? await supabase.from("profiles").select("id, username, display_name, status, is_provider, created_at").or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(25)
    : { data: [] };
  const { data: roles } = await supabase.from("user_roles").select("user_id, role");
  return (
    <>
      <PageHeader title="Gebruikers" intro="Zoek op profielnaam of naam. E-mailadressen en geboortedata zijn hier bewust niet zichtbaar." />
      <form className="mb-6 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Zoeken</label>
        <input id="q" name="q" defaultValue={q} className="input max-w-sm" placeholder="Naam of profielnaam" />
        <button type="submit" className="btn-secondary">Zoeken</button>
      </form>
      <ul className="space-y-3">
        {(users ?? []).map((u) => {
          const userRoles = (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role);
          return (
            <li key={u.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{u.display_name}</span>
                <span className="text-sm text-muted">@{u.username} · sinds {formatDate(u.created_at)}</span>
                <StatusBadge label={u.status} tone={u.status === "actief" ? "ok" : "danger"} />
                {userRoles.map((r) => <StatusBadge key={r} label={r} tone="accent" />)}
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                <ActionForm action={setUserStatus} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="status" value={u.status === "actief" ? "geschorst" : "actief"} />
                  <div><label htmlFor={`r-${u.id}`} className="label">Motivering</label><input id={`r-${u.id}`} name="reason" className="input" /></div>
                  <SubmitButton className={u.status === "actief" ? "btn-danger" : "btn-secondary"}>{u.status === "actief" ? "Schorsen" : "Heractiveren"}</SubmitButton>
                </ActionForm>
                {u.id !== me.id && (
                  <ActionForm action={setRole}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="role" value="moderator" />
                    <input type="hidden" name="grant" value={userRoles.includes("moderator") ? "0" : "1"} />
                    <SubmitButton className="btn-ghost">{userRoles.includes("moderator") ? "Moderatorrol intrekken" : "Moderator maken"}</SubmitButton>
                  </ActionForm>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
