import Link from "next/link";
import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategoryTree } from "@/lib/data";
import { euro, rel } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { Notice, PageHeader, StatusBadge } from "@/components/ui";
import { PlaceInput } from "@/components/PlaceInput";
import { AvatarEditor, PortfolioAdd } from "@/components/ProfileUploads";
import { addService, deletePortfolioItem, requestKvkCheck, setServiceStatus, updateCategories, updateProfile } from "@/actions/account";

export const metadata: Metadata = { title: "Profiel en portfolio" };

const LANGS: [string, string][] = [["nl", "Nederlands"], ["en", "Engels"], ["de", "Duits"], ["fr", "Frans"], ["es", "Spaans"], ["tr", "Turks"], ["ar", "Arabisch"], ["pl", "Pools"]];

export default async function EditProfilePage({ searchParams }: { searchParams: Promise<{ nieuw?: string }> }) {
  const me = await requireMe("/account/profiel");
  const { nieuw } = await searchParams;
  const supabase = await createClient();
  const [{ data: p }, { data: myCats }, { data: portfolio }, { data: services }, { data: kvk }, tree] = await Promise.all([
    supabase.from("profiles").select("*, place:places(name, slug)").eq("id", me.id).single(),
    supabase.from("profile_categories").select("category_id").eq("profile_id", me.id),
    supabase.from("portfolio_items").select("id, title, image_path, video_url").eq("profile_id", me.id).order("sort_order"),
    supabase.from("services").select("id, slug, title, price_type, price_cents, status").eq("provider_id", me.id).neq("status", "verwijderd").order("created_at"),
    supabase.from("verifications").select("status, created_at, note").eq("profile_id", me.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    getCategoryTree(),
  ]);
  const place = rel(p.place) as { name: string; slug: string } | null;
  const chosen = new Set((myCats ?? []).map((c) => c.category_id as number));

  return (
    <>
      <PageHeader title="Profiel en portfolio" actions={p.username && p.is_provider ? <Link href={`/professionals/${p.username}`} className="btn-secondary">Bekijk openbaar profiel</Link> : undefined} />
      {nieuw && <div className="mb-6"><Notice tone="ok" title="Welkom! Vul je profiel in">Kies je categorieën en vertel wat je doet. Opdrachtgevers zien alleen wat je hier invult; je geboortedatum, e-mail en telefoon nooit.</Notice></div>}

      <div className="space-y-8">
        <section className="card p-5 sm:p-6" aria-labelledby="basis">
          <h2 id="basis" className="mb-4 text-lg font-bold">Over jou</h2>
          <AvatarEditor userId={me.id} path={p.avatar_path} name={p.display_name} />
          <ActionForm action={updateProfile} className="mt-6 grid gap-5">
            <label className="flex items-start gap-3 rounded-xl bg-sunken p-3">
              <input type="checkbox" name="is_provider" defaultChecked={p.is_provider} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
              <span><span className="font-semibold">Ik bied diensten aan als professional</span><span className="block text-sm text-muted">Dan ben je vindbaar en kun je reageren op opdrachten. Opdrachten plaatsen kan altijd.</span></span>
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="display_name" className="label">Naam</label><input id="display_name" name="display_name" defaultValue={p.display_name} required maxLength={60} className="input" /></div>
              <div><label htmlFor="headline" className="label">Kop <span className="font-normal text-muted">(optioneel)</span></label><input id="headline" name="headline" defaultValue={p.headline} maxLength={120} className="input" placeholder="Bijv. Schilder met 10 jaar ervaring" /></div>
            </div>
            <div><label htmlFor="bio" className="label">Over jou en je werk</label><textarea id="bio" name="bio" defaultValue={p.bio} rows={6} maxLength={3000} className="input" /><p className="hint">Wat doe je, voor wie, en hoe werk je? Geen telefoonnummer, e-mail of links.</p></div>
            <div><label htmlFor="skills" className="label">Vaardigheden</label><input id="skills" name="skills" defaultValue={(p.skills ?? []).join(", ")} className="input" placeholder="Bijv. binnenschilderwerk, behangen, latex" /><p className="hint">Gescheiden door komma&apos;s, maximaal 20. We gebruiken ze voor matching.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <fieldset><legend className="label">Talen</legend><div className="grid grid-cols-2 gap-1.5 text-sm">{LANGS.map(([c, n]) => <label key={c} className="flex items-center gap-2"><input type="checkbox" name="languages" value={c} defaultChecked={(p.languages ?? []).includes(c)} className="h-4 w-4 accent-[var(--color-accent)]" />{n}</label>)}</div></fieldset>
              <div><label htmlFor="experience_years" className="label">Jaren ervaring <span className="font-normal text-muted">(optioneel)</span></label><input id="experience_years" name="experience_years" type="number" min={0} max={70} defaultValue={p.experience_years ?? ""} className="input" /></div>
            </div>
            <h3 className="mt-2 font-bold">Waar en wanneer</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="pr-plaats" className="label">Woonplaats</label><PlaceInput id="pr-plaats" name="place_slug" defaultSlug={place?.slug} defaultLabel={place?.name} /><p className="hint">Alleen de plaats is zichtbaar.</p></div>
              <div><label htmlFor="travel_radius_km" className="label">Reisafstand</label><select id="travel_radius_km" name="travel_radius_km" defaultValue={String(p.travel_radius_km)} className="input">{[0, 5, 10, 25, 50, 100, 200].map((k) => <option key={k} value={k}>{k === 0 ? "Alleen eigen plaats" : `${k} km`}</option>)}</select></div>
            </div>
            <div className="flex flex-wrap gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="works_on_location" defaultChecked={p.works_on_location} className="h-4 w-4 accent-[var(--color-accent)]" />Ik werk op locatie</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="works_online" defaultChecked={p.works_online} className="h-4 w-4 accent-[var(--color-accent)]" />Ik werk online</label>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div><label htmlFor="availability" className="label">Beschikbaarheid</label><select id="availability" name="availability" defaultValue={p.availability} className="input"><option value="beschikbaar">Beschikbaar</option><option value="beperkt">Beperkt beschikbaar</option><option value="niet_beschikbaar">Niet beschikbaar</option></select></div>
              <div><label htmlFor="available_from" className="label">Beschikbaar vanaf</label><input id="available_from" name="available_from" type="date" defaultValue={p.available_from ?? ""} className="input" /></div>
              <div><label htmlFor="availability_note" className="label">Toelichting</label><input id="availability_note" name="availability_note" defaultValue={p.availability_note} maxLength={200} className="input" placeholder="Bijv. alleen zaterdag" /></div>
            </div>
            <h3 className="mt-2 font-bold">Tarief en type</h3>
            <div className="grid gap-5 sm:grid-cols-3">
              <div><label htmlFor="hourly_rate" className="label">Uurtarief indicatie (€)</label><input id="hourly_rate" name="hourly_rate" inputMode="decimal" defaultValue={p.hourly_rate_cents ? p.hourly_rate_cents / 100 : ""} className="input" /></div>
              <div><label htmlFor="provider_type" className="label">Ik werk als</label><select id="provider_type" name="provider_type" defaultValue={p.provider_type} className="input"><option value="particulier">Particulier</option><option value="zakelijk">Zakelijk (KVK)</option></select></div>
              <div><label htmlFor="company_name" className="label">Bedrijfsnaam</label><input id="company_name" name="company_name" defaultValue={p.company_name ?? ""} maxLength={120} className="input" /></div>
            </div>
            <p className="text-sm text-muted">Dit is verplichte informatie voor consumenten: ze moeten weten of ze met een bedrijf of een particulier zakendoen. Als particulier gelden andere consumentenrechten.</p>
            <div><SubmitButton>Profiel opslaan</SubmitButton></div>
          </ActionForm>
        </section>

        <section id="categorieen" className="card scroll-mt-24 p-5 sm:p-6" aria-labelledby="cat-titel">
          <h2 id="cat-titel" className="text-lg font-bold">Categorieën</h2>
          <p className="mt-1 text-sm text-ink-soft">Kies maximaal 10. Je kunt reageren op opdrachten in deze categorieën (een hoofdcategorie telt voor alle onderdelen). Categorieën met 18+ zijn voor volwassenen.</p>
          <ActionForm action={updateCategories} className="mt-4">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tree.map((parent) => (
                <fieldset key={parent.id}>
                  <legend className="font-semibold"><label className="flex items-center gap-2"><input type="checkbox" name="categorie" value={parent.id} defaultChecked={chosen.has(parent.id)} className="h-4 w-4 accent-[var(--color-accent)]" />{parent.name} (alles)</label></legend>
                  <div className="mt-1.5 space-y-1 pl-6 text-sm">
                    {parent.children.map((c) => (
                      <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="categorie" value={c.id} defaultChecked={chosen.has(c.id)} disabled={me.status.is_minor && c.min_age === 18} className="h-4 w-4 accent-[var(--color-accent)]" />{c.name}{c.min_age === 18 && <span className="text-xs text-muted">18+</span>}</label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="mt-4"><SubmitButton>Categorieën opslaan</SubmitButton></div>
          </ActionForm>
        </section>

        <section id="portfolio" className="scroll-mt-24" aria-labelledby="pf-titel">
          <h2 id="pf-titel" className="mb-3 text-lg font-bold">Portfolio</h2>
          {portfolio && portfolio.length > 0 && (
            <ul className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio.map((it) => (
                <li key={it.id} className="card overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.image_path ? <img src={publicUrl("portfolio", it.image_path) ?? ""} alt={it.title} className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center bg-sunken text-sm text-muted">Videolink</div>}
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className="truncate font-medium">{it.title}</span>
                    <form action={deletePortfolioItem}><input type="hidden" name="id" value={it.id} /><button type="submit" className="text-sm text-muted hover:text-danger hover:underline">Verwijderen</button></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <PortfolioAdd userId={me.id} />
        </section>

        <section id="diensten" className="scroll-mt-24" aria-labelledby="dienst-titel">
          <h2 id="dienst-titel" className="mb-1 text-lg font-bold">Diensten</h2>
          <p className="mb-3 text-sm text-ink-soft">Vaste diensten met een duidelijke prijs, bijvoorbeeld ‘Logo-ontwerp met 2 correctierondes’. Ze staan op je profiel en een eigen pagina.</p>
          {services && services.length > 0 && (
            <ul className="card mb-4 divide-y divide-line">
              {services.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><Link href={`/diensten/${s.slug}`} className="font-semibold hover:underline">{s.title}</Link><p className="text-sm text-muted">{s.price_type === "op_aanvraag" ? "Op aanvraag" : `${s.price_type === "vanaf" ? "Vanaf " : ""}${euro(s.price_cents)}${s.price_type === "uur" ? " p/u" : ""}`}</p></div>
                  <div className="flex items-center gap-3">
                    <StatusBadge label={s.status === "actief" ? "Actief" : s.status === "verborgen" ? "Verborgen door moderatie" : "Gepauzeerd"} tone={s.status === "actief" ? "ok" : "neutral"} />
                    {s.status !== "verborgen" && (
                      <form action={setServiceStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value={s.status === "actief" ? "gepauzeerd" : "actief"} /><button type="submit" className="text-sm link">{s.status === "actief" ? "Pauzeren" : "Activeren"}</button></form>
                    )}
                    <form action={setServiceStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="verwijderd" /><button type="submit" className="text-sm text-muted hover:text-danger hover:underline">Verwijderen</button></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <details className="card p-4">
            <summary className="cursor-pointer font-semibold">Dienst toevoegen</summary>
            <ActionForm action={addService} className="mt-4 grid gap-4">
              <div><label htmlFor="sv-cat" className="label">Categorie</label><select id="sv-cat" name="category_id" required className="input"><option value="">Kies…</option>{tree.map((pa) => <optgroup key={pa.id} label={pa.name}>{pa.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select></div>
              <div><label htmlFor="sv-title" className="label">Titel</label><input id="sv-title" name="title" required minLength={8} maxLength={90} className="input" /></div>
              <div><label htmlFor="sv-desc" className="label">Wat krijgt de klant?</label><textarea id="sv-desc" name="description" required minLength={40} maxLength={5000} rows={4} className="input" /></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><label htmlFor="sv-pt" className="label">Prijs</label><select id="sv-pt" name="price_type" className="input"><option value="vast">Vaste prijs</option><option value="vanaf">Vanaf</option><option value="uur">Per uur</option><option value="op_aanvraag">Op aanvraag</option></select></div>
                <div><label htmlFor="sv-price" className="label">Bedrag (€)</label><input id="sv-price" name="price" inputMode="decimal" className="input" /></div>
                <div><label htmlFor="sv-mode" className="label">Waar</label><select id="sv-mode" name="work_mode" className="input"><option value="op_locatie">Op locatie</option><option value="online">Online</option><option value="beide">Allebei</option></select></div>
              </div>
              <div><label htmlFor="sv-del" className="label">Levertijd of duur <span className="font-normal text-muted">(optioneel)</span></label><input id="sv-del" name="delivery_note" maxLength={120} className="input" placeholder="Bijv. binnen 5 werkdagen" /></div>
              <div><SubmitButton className="btn-secondary">Dienst publiceren</SubmitButton></div>
            </ActionForm>
          </details>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="kvk-titel">
          <h2 id="kvk-titel" className="text-lg font-bold">KVK-controle</h2>
          <p className="mt-1 text-sm text-ink-soft">Ben je ingeschreven bij de KVK? Wij controleren je nummer handmatig in het Handelsregister. Daarna staat ‘KVK gecontroleerd’ op je profiel. Dit zegt iets over je inschrijving, niet over de kwaliteit van je werk, en kan niet worden gekocht.</p>
          {kvk ? (
            <p className="mt-3 text-sm">Laatste aanvraag: <strong>{kvk.status}</strong>{kvk.note ? ` · ${kvk.note}` : ""}</p>
          ) : null}
          {!p.kvk_verified_at && kvk?.status !== "ingediend" && (
            <ActionForm action={requestKvkCheck} hideOnSuccess className="mt-3 flex flex-wrap items-end gap-2">
              <div><label htmlFor="kvk" className="label">KVK-nummer</label><input id="kvk" name="kvk" inputMode="numeric" pattern="[0-9]{8}" required className="input w-40" /></div>
              <SubmitButton className="btn-secondary">Laten controleren</SubmitButton>
            </ActionForm>
          )}
        </section>
      </div>
    </>
  );
}
