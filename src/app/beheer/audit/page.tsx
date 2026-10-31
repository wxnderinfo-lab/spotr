import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/format";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Auditlog" };

export default async function AdminAudit() {
  const me = await getMe();
  if (!me?.status.is_admin) redirect("/beheer");
  const supabase = await createClient();
  const { data } = await supabase.from("audit_log").select("id, actor_id, action, target_type, target_id, details, created_at").order("created_at", { ascending: false }).limit(200);
  const actorIds = [...new Set((data ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, display_name").in("id", actorIds) : { data: [] };
  const name = (id: string | null) => (id ? actors?.find((a) => a.id === id)?.display_name ?? id.slice(0, 8) : "systeem");
  return (
    <>
      <PageHeader title="Auditlog" intro="Laatste 200 beheeracties. Alleen-lezen; niemand kan regels wijzigen of verwijderen via de site." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3">Wanneer</th><th className="p-3">Wie</th><th className="p-3">Actie</th><th className="p-3">Doel</th><th className="p-3">Details</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap p-3">{formatDate(a.created_at)} {formatTime(a.created_at)}</td>
                <td className="p-3">{name(a.actor_id)}</td>
                <td className="p-3 font-medium">{a.action}</td>
                <td className="p-3">{a.target_type} {a.target_id.slice(0, 8)}</td>
                <td className="p-3 font-mono text-xs">{JSON.stringify(a.details).slice(0, 160)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
