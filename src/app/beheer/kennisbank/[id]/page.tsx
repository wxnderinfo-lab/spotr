import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { saveArticle } from "@/actions/admin";

export const metadata = { title: "Artikel bewerken" };

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me?.status.is_admin) redirect("/beheer");
  const { id } = await params;
  const supabase = await createClient();
  const isNew = id === "nieuw";
  const [{ data: a }, { data: authors }, cats] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from("articles").select("*").eq("id", id).maybeSingle(),
    supabase.from("authors").select("id, name"),
    getCategories(),
  ]);
  if (!isNew && !a) notFound();
  return (
    <>
      <PageHeader title={isNew ? "Nieuw artikel" : a.title} actions={!isNew && a.status === "gepubliceerd" ? <Link href={`/kennisbank/${a.slug}`} className="btn-secondary">Bekijken</Link> : undefined} />
      <ActionForm action={saveArticle} className="card grid gap-4 p-5">
        <input type="hidden" name="id" value={a?.id ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="title" className="label">Titel</label><input id="title" name="title" defaultValue={a?.title} required className="input" /></div>
          <div><label htmlFor="slug" className="label">Slug (URL)</label><input id="slug" name="slug" defaultValue={a?.slug} required className="input" /></div>
        </div>
        <div><label htmlFor="excerpt" className="label">Samenvatting</label><textarea id="excerpt" name="excerpt" defaultValue={a?.excerpt} maxLength={300} rows={2} className="input" /></div>
        <div><label htmlFor="body" className="label">Tekst (Markdown: ## kop, - lijst, [link](url), | tabel |)</label><textarea id="body" name="body" defaultValue={a?.body} rows={20} className="input font-mono text-sm" /></div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><label htmlFor="kind" className="label">Soort</label><select id="kind" name="kind" defaultValue={a?.kind ?? "gids"} className="input"><option value="prijsgids">Prijsgids</option><option value="gids">Gids</option><option value="branche">Branche</option><option value="starters">Starters</option></select></div>
          <div><label htmlFor="author_id" className="label">Auteur</label><select id="author_id" name="author_id" defaultValue={a?.author_id ?? authors?.[0]?.id} className="input">{(authors ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div><label htmlFor="category_id" className="label">Categorie</label><select id="category_id" name="category_id" defaultValue={a?.category_id ?? ""} className="input"><option value="">Geen</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label htmlFor="status" className="label">Status</label><select id="status" name="status" defaultValue={a?.status ?? "concept"} className="input"><option value="concept">Concept</option><option value="gepubliceerd">Gepubliceerd</option><option value="gearchiveerd">Gearchiveerd</option></select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="seo_title" className="label">SEO-titel (max. 70)</label><input id="seo_title" name="seo_title" defaultValue={a?.seo_title ?? ""} maxLength={70} className="input" /></div>
          <div><label htmlFor="reviewed_at" className="label">Laatst inhoudelijk gecontroleerd</label><input id="reviewed_at" name="reviewed_at" type="date" defaultValue={a?.reviewed_at ?? ""} className="input" /></div>
        </div>
        <div><label htmlFor="seo_description" className="label">Metabeschrijving (max. 170)</label><textarea id="seo_description" name="seo_description" defaultValue={a?.seo_description ?? ""} maxLength={170} rows={2} className="input" /></div>
        <div><label htmlFor="sources" className="label">Bronnen (JSON-lijst)</label><textarea id="sources" name="sources" defaultValue={JSON.stringify(a?.sources ?? [], null, 1)} rows={6} className="input font-mono text-xs" /></div>
        <div><label htmlFor="related_slugs" className="label">Gerelateerde artikelen (slugs, komma&apos;s)</label><input id="related_slugs" name="related_slugs" defaultValue={(a?.related_slugs ?? []).join(", ")} className="input" /></div>
        <div><SubmitButton>Opslaan</SubmitButton></div>
      </ActionForm>
    </>
  );
}
