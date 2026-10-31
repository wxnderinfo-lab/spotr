import Link from "next/link";
import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jobHref, toQuery } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { deleteSavedSearch, toggleFavorite, toggleSavedSearchNotify } from "@/actions/engage";

export const metadata: Metadata = { title: "Bewaard en zoekopdrachten" };

export default async function FavoritesPage() {
  const me = await requireMe("/account/favorieten");
  const supabase = await createClient();
  const [{ data: favs }, { data: searches }] = await Promise.all([
    supabase.from("favorites").select("target_type, target_id, created_at").eq("user_id", me.id).order("created_at", { ascending: false }),
    supabase.from("saved_searches").select("id, kind, name, params, notify, created_at").eq("user_id", me.id).order("created_at", { ascending: false }),
  ]);
  const ids = (t: string) => (favs ?? []).filter((f) => f.target_type === t).map((f) => f.target_id);
  const [{ data: pros }, { data: jobs }, { data: services }] = await Promise.all([
    ids("professional").length ? supabase.from("profiles").select("id, username, display_name, headline").in("id", ids("professional")) : Promise.resolve({ data: [] }),
    ids("opdracht").length ? supabase.from("jobs").select("id, code, slug, title, status").in("id", ids("opdracht")) : Promise.resolve({ data: [] }),
    ids("dienst").length ? supabase.from("services").select("id, slug, title").in("id", ids("dienst")) : Promise.resolve({ data: [] }),
  ]);
  const items = [
    ...(pros ?? []).map((p) => ({ type: "professional" as const, id: p.id, href: `/professionals/${p.username}`, title: p.display_name, sub: p.headline })),
    ...(jobs ?? []).map((j) => ({ type: "opdracht" as const, id: j.id, href: jobHref(j), title: j.title, sub: j.status === "open" ? "Open" : "Niet meer open" })),
    ...(services ?? []).map((s) => ({ type: "dienst" as const, id: s.id, href: `/diensten/${s.slug}`, title: s.title, sub: "Dienst" })),
  ];
  return (
    <>
      <PageHeader title="Bewaard en zoekopdrachten" />
      <section aria-labelledby="zoekopdrachten" className="mb-10">
        <h2 id="zoekopdrachten" className="mb-3 text-lg font-bold">Opgeslagen zoekopdrachten</h2>
        {searches && searches.length > 0 ? (
          <ul className="card divide-y divide-line">
            {searches.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/${s.kind}${toQuery(s.params as Record<string, string>)}`} className="font-semibold hover:underline">{s.name}</Link>
                  <p className="text-sm text-muted">{s.kind === "opdrachten" ? "Opdrachten" : "Professionals"} · {timeAgo(s.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {s.kind === "opdrachten" && (
                    <form action={toggleSavedSearchNotify}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="notify" value={s.notify ? "0" : "1"} />
                      <button type="submit" className="text-sm link" disabled={!s.notify && !me.status.has_pro} title={!me.status.has_pro ? "Meldingen horen bij Pro" : undefined}>
                        {s.notify ? "Meldingen uitzetten" : me.status.has_pro ? "Meldingen aanzetten" : "Meldingen (Pro)"}
                      </button>
                    </form>
                  )}
                  <form action={deleteSavedSearch}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="text-sm text-muted hover:text-danger hover:underline">Verwijderen</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nog geen zoekopdrachten">Gebruik filters bij <Link href="/opdrachten" className="link">opdrachten</Link> of <Link href="/professionals" className="link">professionals</Link> en kies ‘Zoekopdracht opslaan’.</EmptyState>
        )}
      </section>
      <section aria-labelledby="bewaard">
        <h2 id="bewaard" className="mb-3 text-lg font-bold">Bewaard</h2>
        {items.length > 0 ? (
          <ul className="card divide-y divide-line">
            {items.map((it) => (
              <li key={`${it.type}-${it.id}`} className="flex items-center justify-between gap-3 p-4">
                <div><Link href={it.href} className="font-semibold hover:underline">{it.title}</Link><p className="text-sm text-muted">{it.sub}</p></div>
                <form action={toggleFavorite}>
                  <input type="hidden" name="type" value={it.type} />
                  <input type="hidden" name="id" value={it.id} />
                  <input type="hidden" name="on" value="0" />
                  <input type="hidden" name="pad" value="/account/favorieten" />
                  <button type="submit" className="text-sm text-muted hover:text-danger hover:underline">Verwijderen</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nog niets bewaard">Bewaar opdrachten en professionals om ze later snel terug te vinden.</EmptyState>
        )}
      </section>
    </>
  );
}
