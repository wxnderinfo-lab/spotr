import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MapPin, Monitor, Languages, Briefcase, CalendarCheck, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { site } from "@/config/site";
import { availabilityLabel, euro, formatDate, formatShort, rel } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Avatar, Stars, VerifiedKvk, StatusBadge } from "@/components/ui";
import { ReportButton } from "@/components/ReportButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { JsonLd } from "@/components/JsonLd";

type Props = { params: Promise<{ username: string }> };

const languageNames: Record<string, string> = { nl: "Nederlands", en: "Engels", de: "Duits", fr: "Frans", es: "Spaans", tr: "Turks", ar: "Arabisch", pl: "Pools" };

const getProfile = cache(async (username: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(`id, username, display_name, avatar_path, headline, bio, skills, languages, experience_years, works_on_location, works_online, travel_radius_km,
      hourly_rate_cents, provider_type, company_name, is_provider, availability, available_from, availability_note, kvk_verified_at, created_at, updated_at,
      place:places(name, province)`)
    .eq("username", username.toLowerCase())
    .eq("status", "actief")
    .maybeSingle();
  if (!data || !data.is_provider) return null;
  return { ...data, place: rel(data.place) as { name: string; province: string } | null };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProfile((await params).username);
  if (!p) return { title: "Profiel niet gevonden", robots: { index: false } };
  const thin = (p.bio ?? "").length < 80 && !p.headline;
  return {
    title: `${p.display_name}${p.headline ? `, ${p.headline}` : ""}`,
    description: `${p.display_name}${p.place ? ` uit ${p.place.name}` : ""}${p.headline ? `: ${p.headline}` : ""}. Bekijk portfolio, diensten en beoordelingen op Jobmarkt.`.slice(0, 160),
    alternates: { canonical: `/professionals/${p.username}` },
    robots: thin ? { index: false, follow: true } : undefined,
    openGraph: { type: "profile" },
  };
}

export default async function ProfilePage({ params }: Props) {
  const p = await getProfile((await params).username);
  if (!p) notFound();
  const supabase = await createClient();
  const me = await getMe();
  const path = `/professionals/${p.username}`;

  const [{ data: stats }, { data: reviews }, { data: portfolio }, { data: services }, { data: cats }, { data: age }, fav] = await Promise.all([
    supabase.rpc("profile_stats", { p_profile: p.id }),
    supabase.rpc("get_reviews", { p_profile: p.id, p_limit: 20, p_offset: 0 }),
    supabase.from("portfolio_items").select("id, title, description, image_path, video_url").eq("profile_id", p.id).order("sort_order"),
    supabase.from("services").select("id, slug, title, price_type, price_cents, work_mode").eq("provider_id", p.id).eq("status", "actief").order("created_at"),
    supabase.from("profile_categories").select("category:categories(slug, name, parent_id)").eq("profile_id", p.id),
    supabase.rpc("public_age", { p_user: p.id }),
    me ? supabase.from("favorites").select("target_id").match({ user_id: me.id, target_type: "professional", target_id: p.id }).maybeSingle().then((r) => !!r.data) : false,
  ]);
  const providerReviews = ((reviews ?? []) as { id: string; reviewee_role: string; rating: number; rating_communication: number | null; rating_quality: number | null; rating_reliability: number | null; body: string; response: string | null; job_title: string; job_category: string; reviewer_name: string; created_at: string; completed_at: string }[]).filter((r) => r.reviewee_role === "professional");
  const categories = (cats ?? []).map((c) => rel(c.category) as { slug: string; name: string } | null).filter(Boolean) as { slug: string; name: string }[];

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ name: "Professionals", href: "/professionals" }, { name: p.display_name }]} />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar src={publicUrl("avatars", p.avatar_path)} name={p.display_name} size={96} />
            <div>
              <h1 className="text-3xl font-extrabold">{p.display_name}</h1>
              {p.headline && <p className="mt-1 text-lg text-ink-soft">{p.headline}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="chip">{p.provider_type === "zakelijk" ? `Zakelijk${p.company_name ? ` · ${p.company_name}` : ""}` : "Particulier"}</span>
                {p.kvk_verified_at && <VerifiedKvk />}
                <StatusBadge label={availabilityLabel[p.availability]} tone={p.availability === "beschikbaar" ? "ok" : p.availability === "beperkt" ? "warn" : "neutral"} />
              </div>
            </div>
          </header>

          <section className="mt-8" aria-labelledby="over">
            <h2 id="over" className="mb-2 text-xl font-bold">Over {p.display_name.split(" ")[0]}</h2>
            {p.bio ? <div className="whitespace-pre-line text-ink-soft">{p.bio}</div> : <p className="text-muted">Nog geen beschrijving.</p>}
            {p.skills && p.skills.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Vaardigheden">
                {p.skills.map((s: string) => <li key={s} className="chip">{s}</li>)}
              </ul>
            )}
          </section>

          {portfolio && portfolio.length > 0 && (
            <section className="mt-10" aria-labelledby="portfolio">
              <h2 id="portfolio" className="mb-3 text-xl font-bold">Portfolio</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {portfolio.map((it) => (
                  <li key={it.id} className="card overflow-hidden">
                    {it.image_path && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={publicUrl("portfolio", it.image_path) ?? ""} alt={it.title} loading="lazy" width={640} height={480} className="aspect-[4/3] w-full object-cover" />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold">{it.title}</h3>
                      {it.description && <p className="mt-1 text-sm text-ink-soft">{it.description}</p>}
                      {it.video_url && (
                        <a href={it.video_url} rel="ugc nofollow noopener noreferrer" target="_blank" className="link mt-2 inline-flex items-center gap-1 text-sm">
                          Video bekijken <ExternalLink className="h-3.5 w-3.5" aria-hidden /><span className="sr-only">(opent externe site)</span>
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {services && services.length > 0 && (
            <section className="mt-10" aria-labelledby="diensten">
              <h2 id="diensten" className="mb-3 text-xl font-bold">Diensten</h2>
              <ul className="grid gap-3">
                {services.map((s) => (
                  <li key={s.id}>
                    <Link href={`/diensten/${s.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-line-strong">
                      <span className="font-semibold">{s.title}</span>
                      <span className="shrink-0 text-sm text-ink-soft">
                        {s.price_type === "op_aanvraag" ? "Prijs op aanvraag" : `${s.price_type === "vanaf" ? "Vanaf " : ""}${euro(s.price_cents)}${s.price_type === "uur" ? " p/u" : ""}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10" aria-labelledby="beoordelingen">
            <h2 id="beoordelingen" className="text-xl font-bold">Beoordelingen</h2>
            <div className="mt-2"><Stars value={stats?.rating_avg ?? null} count={stats?.rating_count ?? 0} size="md" /></div>
            <p className="mt-2 text-sm text-muted">
              Alleen van opdrachtgevers na een afgeronde opdracht via Jobmarkt. Beide partijen beoordelen blind; beoordelingen verschijnen pas als beiden klaar zijn of na 14 dagen.{" "}
              <Link href="/hoe-het-werkt#beoordelingen" className="link">Zo werkt het</Link>
            </p>
            {providerReviews.length > 0 ? (
              <ul className="mt-5 space-y-4">
                {providerReviews.map((r) => (
                  <li key={r.id} className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Stars value={r.rating} single />
                      <span className="chip">Geverifieerde opdracht · {formatShort(r.completed_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{r.reviewer_name} over “{r.job_title}” ({r.job_category})</p>
                    {r.body && <p className="mt-3 text-ink-soft">{r.body}</p>}
                    <dl className="mt-3 flex flex-wrap gap-x-4 text-sm text-muted">
                      {r.rating_communication && <div><dt className="inline">Communicatie </dt><dd className="inline font-semibold text-ink">{r.rating_communication}/5</dd></div>}
                      {r.rating_quality && <div><dt className="inline">Kwaliteit </dt><dd className="inline font-semibold text-ink">{r.rating_quality}/5</dd></div>}
                      {r.rating_reliability && <div><dt className="inline">Afspraken nakomen </dt><dd className="inline font-semibold text-ink">{r.rating_reliability}/5</dd></div>}
                    </dl>
                    {r.response && <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm text-ink-soft"><span className="font-semibold text-ink">Reactie van {p.display_name}: </span>{r.response}</p>}
                    <div className="mt-2"><ReportButton targetType="beoordeling" targetId={r.id} label="Beoordeling melden" /></div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-ink-soft">{p.display_name.split(" ")[0]} is nieuw op Jobmarkt en heeft nog geen beoordelingen. Kijk naar het portfolio en stel vragen bij je opdracht.</p>
            )}
            {(stats?.hidden_count ?? 0) > 0 && (
              <p className="mt-3 text-sm text-muted">{stats.hidden_count} beoordeling(en) verborgen na moderatie volgens de <Link className="link" href="/communityregels#beoordelingen">communityregels</Link>.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-3 p-5 text-sm">
            {p.hourly_rate_cents && <p className="text-base"><span className="text-2xl font-extrabold">{euro(p.hourly_rate_cents)}</span> <span className="text-muted">per uur (indicatie)</span></p>}
            {p.works_on_location && p.place && <p className="flex gap-2"><MapPin className="h-4 w-4 text-accent" aria-hidden /> {p.place.name}, werkt tot {p.travel_radius_km} km</p>}
            {p.works_online && <p className="flex gap-2"><Monitor className="h-4 w-4 text-accent" aria-hidden /> Werkt ook online</p>}
            {p.experience_years != null && <p className="flex gap-2"><Briefcase className="h-4 w-4 text-accent" aria-hidden /> {p.experience_years} jaar ervaring</p>}
            {p.languages?.length > 0 && <p className="flex gap-2"><Languages className="h-4 w-4 text-accent" aria-hidden /> {p.languages.map((l: string) => languageNames[l] ?? l).join(", ")}</p>}
            {(p.available_from || p.availability_note) && (
              <p className="flex gap-2"><CalendarCheck className="h-4 w-4 text-accent" aria-hidden /> {p.available_from ? `Beschikbaar vanaf ${formatDate(p.available_from)}` : ""}{p.availability_note ? ` ${p.availability_note}` : ""}</p>
            )}
            {age !== null && age !== undefined && <p className="text-muted">{age} jaar</p>}
            <p className="text-muted">{stats?.completed_as_provider ?? 0} afgeronde opdracht(en) via Jobmarkt · lid sinds {formatDate(p.created_at)}</p>
            {categories.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {categories.map((c) => <li key={c.slug}><Link className="chip hover:border-line-strong" href={`/professionals?categorie=${c.slug}`}>{c.name}</Link></li>)}
              </ul>
            )}
          </div>
          <div className="card p-5">
            <h2 className="font-bold">Samenwerken?</h2>
            <p className="mt-1 text-sm text-ink-soft">Plaats je opdracht. Professionals zoals {p.display_name.split(" ")[0]} kunnen dan een voorstel sturen. Contactgegevens deel je pas na je keuze.</p>
            <Link href="/opdracht-plaatsen" className="btn-primary mt-4 w-full">Plaats een opdracht</Link>
            {me && me.id !== p.id && <div className="mt-2"><FavoriteButton type="professional" id={p.id} on={fav} path={path} /></div>}
          </div>
          <ReportButton targetType="profiel" targetId={p.id} label="Profiel melden" />
        </aside>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          dateCreated: p.created_at,
          dateModified: p.updated_at,
          mainEntity: {
            "@type": "Person",
            name: p.display_name,
            ...(p.headline ? { description: p.headline } : {}),
            ...(p.avatar_path ? { image: publicUrl("avatars", p.avatar_path) } : {}),
            url: `${site.url}${path}`,
            ...(p.skills?.length ? { knowsAbout: p.skills } : {}),
          },
        }}
      />
    </div>
  );
}
