import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { MapPin, Monitor, CalendarDays, Wallet, Users, Info, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { categoryPath, jobHref } from "@/lib/data";
import { budgetLabel, formatDate, jobStatusLabel, timeAgo, timingLabel, proposalStatusLabel, euro, rel } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Avatar, Notice, Stars, StatusBadge, jobStatusTone } from "@/components/ui";
import { ReportButton } from "@/components/ReportButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { askQuestion, answerQuestion, submitProposal } from "@/actions/jobs";
import { ProposalFields } from "@/components/ProposalFields";

type Props = { params: Promise<{ slug: string }> };

const getJob = cache(async (code: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(`id, code, slug, title, description, work_mode, budget_type, budget_min_cents, budget_max_cents, timing, due_date, answers,
      status, moderation_status, client_id, assigned_provider_id, proposal_count, published_at, expires_at, created_at,
      category:categories(id, slug, name, regulation_note, min_age, questions),
      place:places(name, slug, province),
      client:profiles!jobs_client_id_fkey(id, display_name, username, avatar_path, created_at),
      attachments:job_attachments(id, path, alt)`)
    .eq("code", code)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    category: rel(data.category) as { id: number; slug: string; name: string; regulation_note: string | null; min_age: number; questions: unknown } | null,
    place: rel(data.place) as { name: string; slug: string; province: string } | null,
    client: rel(data.client) as { id: string; display_name: string; username: string | null; avatar_path: string | null; created_at: string } | null,
    attachments: (data.attachments ?? []) as { id: string; path: string; alt: string }[],
  };
});

const codeFrom = (slug: string) => /-([0-9a-f]{8})$/.exec(slug)?.[1] ?? (/^[0-9a-f]{8}$/.test(slug) ? slug : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = codeFrom((await params).slug);
  const job = code ? await getJob(code) : null;
  if (!job) return { title: "Opdracht niet gevonden", robots: { index: false } };
  const where = job.work_mode === "online" ? "online" : `in ${job.place?.name}`;
  return {
    title: `${job.title} (${where})`,
    description: `${job.category?.name} ${where}. ${job.description.slice(0, 130).replace(/\s+/g, " ")}…`,
    alternates: { canonical: jobHref(job) },
    // alleen open opdrachten indexeren; gesloten pagina's blijven bereikbaar voor deelnemers
    robots: job.status === "open" && job.moderation_status === "ok" ? undefined : { index: false, follow: true },
  };
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const code = codeFrom(slug);
  if (!code) notFound();
  const job = await getJob(code);
  if (!job || !job.category) notFound();
  if (slug !== `${job.slug}-${job.code}`) permanentRedirect(jobHref(job));

  const supabase = await createClient();
  const me = await getMe();
  const path = jobHref(job);
  const isOwner = me?.id === job.client_id;
  const isOpen = job.status === "open" && job.moderation_status === "ok" && (!job.expires_at || new Date(job.expires_at) > new Date());
  const cat = await categoryPath(job.category.slug);

  const [{ data: questions }, { data: clientStats }, myProposal, portfolio, myCats, fav] = await Promise.all([
    supabase.from("job_questions").select("id, question, answer, answered_at, created_at, asker:profiles!job_questions_asker_id_fkey(display_name)").eq("job_id", job.id).eq("status", "zichtbaar").order("created_at"),
    supabase.rpc("profile_stats", { p_profile: job.client_id }),
    me && !isOwner ? supabase.from("proposals").select("id, status, amount_cents, price_type, created_at").eq("job_id", job.id).eq("provider_id", me.id).maybeSingle().then((r) => r.data) : null,
    me && !isOwner ? supabase.from("portfolio_items").select("id, title").eq("profile_id", me.id).order("sort_order").then((r) => (r.data ?? []) as { id: string; title: string }[]) : [],
    me && !isOwner ? supabase.from("profile_categories").select("category_id").eq("profile_id", me.id).then((r) => (r.data ?? []).map((x) => x.category_id as number)) : ([] as number[]),
    me ? supabase.from("favorites").select("target_id").match({ user_id: me.id, target_type: "opdracht", target_id: job.id }).maybeSingle().then((r) => !!r.data) : false,
  ]);
  const catFits = !!cat && (myCats.includes(cat.cat.id) || (cat.parent ? myCats.includes(cat.parent.id) : false));
  const questionsDef = (job.category.questions ?? []) as { key: string; label: string }[];
  const answers = Object.entries((job.answers ?? {}) as Record<string, string>).filter(([, v]) => v);

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { name: "Opdrachten", href: "/opdrachten" },
          ...(cat?.parent ? [{ name: cat.parent.name, href: `/categorieen/${cat.parent.slug}` }] : []),
          ...(cat ? [{ name: cat.cat.name, href: cat.href }] : []),
          { name: job.title },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <article>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge label={jobStatusLabel[job.status]} tone={jobStatusTone(job.status)} />
            {job.published_at && <span className="text-sm text-muted">Geplaatst {timeAgo(job.published_at)}</span>}
          </div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{job.title}</h1>

          {!isOpen && job.status !== "concept" && (
            <div className="mt-4">
              <Notice tone="warn" title="Deze opdracht staat niet meer open">
                Je kunt geen voorstel meer sturen. <Link className="link" href={`/opdrachten?categorie=${job.category.slug}`}>Bekijk vergelijkbare opdrachten</Link>.
              </Notice>
            </div>
          )}
          {job.moderation_status === "in_beoordeling" && isOwner && (
            <div className="mt-4"><Notice tone="info" title="We controleren je opdracht">Hij is nog niet openbaar. Meestal duurt dat minder dan een werkdag.</Notice></div>
          )}

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="card flex gap-3 p-4">
              {job.work_mode === "online" ? <Monitor className="h-5 w-5 text-accent" aria-hidden /> : <MapPin className="h-5 w-5 text-accent" aria-hidden />}
              <div><dt className="text-sm text-muted">Waar</dt><dd className="font-semibold">{job.work_mode === "online" ? "Online, op afstand" : `${job.place?.name}, ${job.place?.province}`}</dd></div>
            </div>
            <div className="card flex gap-3 p-4">
              <Wallet className="h-5 w-5 text-accent" aria-hidden />
              <div><dt className="text-sm text-muted">Budget</dt><dd className="font-semibold">{budgetLabel(job.budget_type, job.budget_min_cents, job.budget_max_cents)}</dd></div>
            </div>
            <div className="card flex gap-3 p-4">
              <CalendarDays className="h-5 w-5 text-accent" aria-hidden />
              <div><dt className="text-sm text-muted">Wanneer</dt><dd className="font-semibold">{timingLabel[job.timing]}{job.due_date ? `: ${formatDate(job.due_date)}` : ""}</dd></div>
            </div>
            <div className="card flex gap-3 p-4">
              <Users className="h-5 w-5 text-accent" aria-hidden />
              <div><dt className="text-sm text-muted">Voorstellen</dt><dd className="font-semibold">{job.proposal_count === 0 ? "Nog geen" : job.proposal_count}</dd></div>
            </div>
          </dl>

          <section className="mt-8" aria-labelledby="omschrijving">
            <h2 id="omschrijving" className="mb-2 text-xl font-bold">Omschrijving</h2>
            <div className="whitespace-pre-line text-ink-soft">{job.description}</div>
            {answers.length > 0 && (
              <dl className="mt-5 grid gap-2 text-sm">
                {answers.map(([k, v]) => (
                  <div key={k} className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold">{questionsDef.find((q) => q.key === k)?.label ?? k}</dt>
                    <dd className="text-ink-soft">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {job.attachments && job.attachments.length > 0 && (
            <section className="mt-8" aria-labelledby="fotos">
              <h2 id="fotos" className="mb-3 text-xl font-bold">Foto&apos;s</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {job.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={publicUrl("job-media", a.path) ?? "#"}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={publicUrl("job-media", a.path) ?? ""} alt={a.alt || `Foto bij: ${job.title}`} loading="lazy" width={400} height={300} className="aspect-[4/3] w-full rounded-xl border border-line object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {job.category.regulation_note && (
            <div className="mt-8"><Notice tone="info" title="Goed om te weten">{job.category.regulation_note}</Notice></div>
          )}

          <section id="vragen" className="mt-10 scroll-mt-24" aria-labelledby="vragen-titel">
            <h2 id="vragen-titel" className="text-xl font-bold">Vragen over deze opdracht</h2>
            <p className="mt-1 text-sm text-muted">Vragen en antwoorden zijn openbaar. Deel hier geen telefoonnummer, e-mailadres of adres.</p>
            {questions && questions.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {questions.map((q) => (
                  <li key={q.id} className="card p-4">
                    <p className="font-medium">{q.question}</p>
                    <p className="mt-0.5 text-xs text-muted">{(q.asker as unknown as { display_name: string } | null)?.display_name ?? "Gebruiker"} · {timeAgo(q.created_at)}</p>
                    {q.answer ? (
                      <p className="mt-3 border-l-2 border-accent pl-3 text-ink-soft"><span className="sr-only">Antwoord: </span>{q.answer}</p>
                    ) : isOwner ? (
                      <ActionForm action={answerQuestion} className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="pad" value={path} />
                        <label htmlFor={`a-${q.id}`} className="sr-only">Je antwoord</label>
                        <input id={`a-${q.id}`} name="answer" required className="input" placeholder="Je antwoord" />
                        <SubmitButton className="btn-secondary">Beantwoorden</SubmitButton>
                      </ActionForm>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Nog niet beantwoord</p>
                    )}
                    <div className="mt-2"><ReportButton targetType="vraag" targetId={q.id} /></div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-ink-soft">Nog geen vragen.</p>
            )}
            {isOpen && me && !isOwner && (
              <ActionForm action={askQuestion} className="mt-4 space-y-2">
                <input type="hidden" name="job" value={job.id} />
                <input type="hidden" name="pad" value={path} />
                <label htmlFor="vraag" className="label">Stel een vraag</label>
                <textarea id="vraag" name="question" rows={2} minLength={5} maxLength={600} required className="input" />
                <SubmitButton className="btn-secondary">Vraag plaatsen</SubmitButton>
              </ActionForm>
            )}
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-4">
            {me && !isOwner && <FavoriteButton type="opdracht" id={job.id} on={fav} path={path} />}
            <ReportButton targetType="opdracht" targetId={job.id} label="Deze opdracht melden" />
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Reageren">
          <div className="card p-5">
            {isOwner ? (
              <>
                <h2 className="font-bold">Jouw opdracht</h2>
                <p className="mt-1 text-sm text-ink-soft">Bekijk en vergelijk de voorstellen in je account.</p>
                <Link href={`/account/opdrachten/${job.id}`} className="btn-primary mt-4 w-full">Voorstellen bekijken</Link>
              </>
            ) : myProposal ? (
              <>
                <h2 className="font-bold">Je hebt gereageerd</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {euro(myProposal.amount_cents)}{myProposal.price_type === "uur" ? " per uur" : ""} · {proposalStatusLabel[myProposal.status]}
                </p>
                <Link href="/account/voorstellen" className="btn-secondary mt-4 w-full">Mijn voorstellen</Link>
              </>
            ) : !isOpen ? (
              <p className="text-sm text-ink-soft">Deze opdracht neemt geen voorstellen meer aan.</p>
            ) : !me ? (
              <>
                <h2 className="font-bold">Interesse in deze opdracht?</h2>
                <p className="mt-1 text-sm text-ink-soft">Maak gratis een profiel en stuur een voorstel met je prijs en planning.</p>
                <Link href={`/aanmelden?rol=professional&volgende=${encodeURIComponent(path)}`} className="btn-primary mt-4 w-full">Account maken en reageren</Link>
                <Link href={`/inloggen?volgende=${encodeURIComponent(path)}`} className="btn-ghost mt-2 w-full">Ik heb al een account</Link>
              </>
            ) : !me.status.onboarded ? (
              <Link href={`/welkom?volgende=${encodeURIComponent(path)}`} className="btn-primary w-full">Maak je profiel af om te reageren</Link>
            ) : !me.status.can_contract ? (
              <Notice tone="warn" title="Reageren kan nog niet">
                {me.status.is_minor ? <>Omdat je 16 of 17 bent, heb je eerst toestemming van een ouder of voogd nodig. <Link className="link" href="/account/instellingen#toestemming">Toestemming vragen</Link></> : "Vul eerst je geboortedatum in."}
              </Notice>
            ) : me.status.is_minor && job.category.min_age === 18 ? (
              <Notice tone="warn" title="Alleen voor 18+">In deze categorie kun je pas reageren als je 18 bent.</Notice>
            ) : !catFits ? (
              <Notice tone="info" title="Past dit bij jou?">
                Voeg <strong>{cat?.parent?.name ?? job.category.name}</strong> toe aan je profiel om te reageren. <Link className="link" href="/account/profiel#categorieen">Categorieën kiezen</Link>
              </Notice>
            ) : !me.status.has_pro && me.status.proposal_limit !== null && me.status.proposals_this_month >= me.status.proposal_limit ? (
              <Notice tone="warn" title="Je maandlimiet is bereikt">
                Je hebt {me.status.proposals_this_month} van {me.status.proposal_limit} gratis voorstellen gebruikt. Volgende maand kan het weer. <Link className="link" href="/prijzen">Over Pro</Link>
              </Notice>
            ) : (
              <>
                <h2 className="font-bold">Stuur een voorstel</h2>
                <p className="mt-1 text-sm text-muted">
                  {me.status.has_pro ? "Pro: geen maandlimiet." : `${me.status.proposals_this_month} van ${me.status.proposal_limit} gratis voorstellen deze maand gebruikt.`}
                </p>
                <ActionForm action={submitProposal} hideOnSuccess className="mt-4 space-y-4">
                  <input type="hidden" name="job" value={job.id} />
                  <input type="hidden" name="pad" value={path} />
                  <ProposalFields budgetType={job.budget_type} portfolio={portfolio} />
                  <SubmitButton className="btn-primary w-full">Voorstel versturen</SubmitButton>
                </ActionForm>
              </>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-muted">Opdrachtgever</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar src={publicUrl("avatars", job.client?.avatar_path)} name={job.client?.display_name ?? ""} size={44} />
              <div>
                <p className="font-semibold">{job.client?.display_name}</p>
                <p className="text-sm text-muted">Lid sinds {job.client ? formatDate(job.client.created_at) : ""}</p>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <Stars value={clientStats?.client_rating_avg ?? null} count={clientStats?.client_rating_count ?? 0} />
              <p className="mt-1 text-muted">{clientStats?.completed_as_client ?? 0} afgeronde opdracht(en) via Jobmarkt</p>
            </div>
          </div>

          <p className="flex gap-2 px-1 text-sm text-muted">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            Contactgegevens deel je pas na acceptatie, in een privégesprek. Betaling regel je samen; Jobmarkt houdt geen geld vast.
          </p>
          <p className="flex gap-2 px-1 text-sm text-muted">
            <Info className="h-4 w-4 shrink-0" aria-hidden /> Opdrachtcode {job.code}
          </p>
        </aside>
      </div>
    </div>
  );
}
