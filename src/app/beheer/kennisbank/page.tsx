import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Kennisbank" };

export default async function AdminArticles() {
  const me = await getMe();
  if (!me?.status.is_admin) redirect("/beheer");
  const supabase = await createClient();
  const { data } = await supabase.from("articles").select("id, slug, title, status, kind, updated_at, reviewed_at").order("updated_at", { ascending: false });
  return (
    <>
      <PageHeader title="Kennisbank" intro="Weinig, maar sterk en controleerbaar: echte auteur, bronnen en een controledatum per artikel." actions={<Link href="/beheer/kennisbank/nieuw" className="btn-primary">Nieuw artikel</Link>} />
      <ul className="card divide-y divide-line">
        {(data ?? []).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div><Link href={`/beheer/kennisbank/${a.id}`} className="font-semibold hover:underline">{a.title}</Link><p className="text-sm text-muted">/{a.slug} · {a.kind} · bijgewerkt {formatDate(a.updated_at)}{a.reviewed_at ? ` · gecontroleerd ${formatDate(a.reviewed_at)}` : ""}</p></div>
            <StatusBadge label={a.status} tone={a.status === "gepubliceerd" ? "ok" : "neutral"} />
          </li>
        ))}
      </ul>
    </>
  );
}
