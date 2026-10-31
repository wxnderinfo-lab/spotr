import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Monitor, MessageSquare, Trash2 } from "lucide-react";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jobHref } from "@/lib/data";
import { budgetLabel, euro, formatDate, formatShort, jobStatusLabel, proposalStatusLabel, rel, timeAgo, timingLabel } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { Avatar, Notice, PageHeader, Stars, StatusBadge, VerifiedKvk, jobStatusTone } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/forms";
import { JobPhotoUpload } from "@/components/JobPhotos";
import { ReviewForm } from "@/components/ReviewForm";
import { acceptProposal, declineProposal, deleteDraft, publishJob, removeJobAttachment, transitionJob } from "@/actions/jobs";
import { blockUser } from "@/actions/engage";

export const metadata: Metadata = { title: "Opdracht beheren" };

type Proposal = {
  id: string; price_type: string; amount_cents: number; estimated_hours: number | null; message: string; planning: string; available_from: string | null;
  portfolio_item_ids: string[]; status: string; created_at: string;
  provider: { id: string; username: string | null; display_name: string; avatar_path: string | null; headline: string; provider_type: string; kvk_verified_at: string | null } | null;
};

export default async function ManageJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ geplaatst?: string; gecontroleerd?: string; sorteer?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await requireMe(`/account/opdrachten/${id}`);
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select(`id, code, slug, title, description, work_mode, budget_type, budget_min_cents, budget_max_cents, timing, due_date, status, moderation_status, moderation_reason,
      client_id, assigned_provider_id, proposal_count, published_at, expires_at, completed_at, created_at,
      category:categories(name), place:places(name),
      attachments:job_attachments(id, path)`)
    .eq("id", id)
    .maybeSingle();
  if (!job || (job.client_id !== me.id && job.assigned_provider_id !== me.id)) notFound();
  const isClient = job.client_id === me.id;
  const category = rel(job.category) as { name: string } | null;
  const place = rel(job.place) as { name: string } | null;
  const attachments = (job.attachments ?? []) as { id: string; path: string }[];

  const [{ data: proposalsRaw }, { data: conversation }, { data: history }, { data: myReview }, { data: other }] = await Promise.all([
    isClient
      ? supabase.from("proposals").select("id, price_type, amount_cents, estimated_hours, message, planning, available_from, portfolio_item_ids, status, created_at, provider:profiles!proposals_provider_id_fkey(id, username, display_name, avatar_path, headline, provider_type, kvk_verified_at)").eq("job_id", job.id).order("created_at")
      : Promise.resolve({ data: [] }),
    supabase.from("conversations").select("id").eq("job_id", job.id).maybeSingle(),
    supabase.from("job_status_history").select("to_status, note, created_at").eq("job_id", job.id).order("created_at"),
    supabase.from("reviews").select("id").eq("job_id", job.id).eq("reviewer_id", me.id).maybeSingle(),
    supabase.from("profiles").select("id, display_name, username").eq("id", isClient ? job.assigned_provider_id ?? "00000000-0000-0000-0000-000000000000" : job.client_id).maybeSingle(),
  ]);
  const proposals = ((proposalsRaw ?? []) as unknown as (Proposal & { provider: unknown })[]).map((p) => ({ ...p, provider: rel(p.provider as Proposal["provider"] | Proposal["provider"][]) })) as Proposal[];
  if (sp.sorteer === "prijs") proposals.sort((a, b) => a.amount_cents - b.amount_cents);
  const providerIds = proposals.map((p) => p.provider?.id).filter(Boolean) as string[];
  const allPortfolioIds = proposals.flatMap((p) => p.portfolio_item_ids);
  const [statsList, { data: portfolioItems }] = await Promise.all([
    Promise.all(providerIds.map((pid) => supabase.rpc("profile_stats", { p_profile: pid }).then((r) => [pid, r.data] as const))),
    allPortfolioIds.length ? supabase.from("portfolio_items").select("id, title, image_path").in("id", allPortfolioIds) : Promise.resolve({ data: [] }),
  ]);
  const stats = Object.fromEntries(statsList) as Record<string, { rating_avg: number | null; rating_count: number; completed_as_provider: number } | null>;
  const open = proposals.filter((p) => p.status === "verstuurd");
  const reviewOpen = job.status === "afgerond" && !myReview && job.completed_at && Date.now() - new Date(job.completed_at).getTime() < 30 * 864e5;

  return (
    <>
      <PageHeader
        eyebrow={isClient ? "Jouw opdracht" : `Opdracht voor ${other?.display_name ?? "opdrachtgever"}`}
        title={job.title}
        actions={
          <>
            {conversation && <Link href={`/berichten/${conversation.id}`} className="btn-primary"><MessageSquare className="h-4 w-4" aria-hidden /> Gesprek</Link>}
            {job.status !== "concept" && <Link href={jobHref(job)} className="btn-secondary">Openbare pagina</Link>}
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge label={jobStatusLabel[job.status]} tone={jobStatusTone(job.status)} />
        {job.moderation_status === "in_beoordeling" && <StatusBadge label="Wordt gecontroleerd" tone="warn" />}
        {job.moderation_status === "afgewezen" && <StatusBadge label="Niet gepubliceerd" tone="danger" />}
      </div>

      <div className="space-y-6">
        {sp.geplaatst && <Notice tone="ok" title="Je opdracht staat online">Professionals kunnen nu reageren. Je krijgt een melding bij elk voorstel en elke vraag.</Notice>}
        {(sp.gecontroleerd || job.moderation_status === "in_beoordeling") && (
          <Notice tone="info" title="We kijken even mee voordat je opdracht online gaat">
            Je tekst bevat een link, contactgegevens of een woord dat we controleren. Meestal is dit binnen een werkdag klaar. Contactgegevens kun je na je keuze in het privégesprek delen.
          </Notice>
        )}
        {job.moderation_status === "afgewezen" && <Notice tone="danger" title="Niet gepubliceerd">{job.moderation_reason} Niet eens met dit besluit? <Link className="link" href="/account/meldingen-en-bezwaar">Maak bezwaar</Link>.</Notice>}

        {job.status === "concept" && isClient && (
          <section className="card p-5 sm:p-6" aria-labelledby="voorbeeld">
            <p className="eyebrow">Stap 2 van 2: controleren</p>
            <h2 id="voorbeeld" className="mt-1 text-xl font-bold">Zo ziet je opdracht eruit</h2>
            <div className="mt-4 rounded-xl border border-line bg-paper p-4">
              <p className="text-sm text-muted">{category?.name}</p>
              <p className="mt-1 text-lg font-bold">{job.title}</p>
              <p className="mt-2 whitespace-pre-line text-ink-soft">{job.description}</p>
              <p className="mt-3 flex flex-wrap gap-x-4 text-sm">
                <span className="flex items-center gap-1">{job.work_mode === "online" ? <Monitor className="h-4 w-4" aria-hidden /> : <MapPin className="h-4 w-4" aria-hidden />}{job.work_mode === "online" ? "Online" : place?.name}</span>
                <span className="font-semibold">{budgetLabel(job.budget_type, job.budget_min_cents, job.budget_max_cents)}</span>
                <span>{timingLabel[job.timing]}{job.due_date ? `: ${formatDate(job.due_date)}` : ""}</span>
              </p>
            </div>
            <div className="mt-5">
              <h3 className="font-semibold">Foto&apos;s <span className="font-normal text-muted">(optioneel)</span></h3>
              {attachments.length > 0 && (
                <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {attachments.map((a) => (
                    <li key={a.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={publicUrl("job-media", a.path) ?? ""} alt="" className="aspect-square w-full rounded-lg object-cover" />
                      <form action={removeJobAttachment} className="absolute right-1 top-1">
                        <input type="hidden" name="id" value={a.id} />
                        <button type="submit" className="rounded-full bg-surface/90 p-1.5" aria-label="Foto verwijderen"><Trash2 className="h-4 w-4" aria-hidden /></button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3"><JobPhotoUpload jobId={job.id} userId={me.id} count={attachments.length} /></div>
            </div>
            <div className="mt-6 flex flex-wrap items-start gap-2 border-t border-line pt-5">
              <ActionForm action={publishJob}>
                <input type="hidden" name="id" value={job.id} />
                <SubmitButton>Publiceren</SubmitButton>
              </ActionForm>
              <Link href={`/opdracht-plaatsen?concept=${job.id}`} className="btn-secondary">Bewerken</Link>
              <form action={deleteDraft}>
                <input type="hidden" name="id" value={job.id} />
                <button type="submit" className="btn-ghost">Concept verwijderen</button>
              </form>
            </div>
            <p className="mt-3 text-sm text-muted">Na publiceren is je opdracht 30 dagen zichtbaar. Je kunt hem aanpassen zolang er nog geen voorstellen zijn.</p>
          </section>
        )}

        {isClient && job.status === "open" && (
          <section aria-labelledby="voorstellen">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 id="voorstellen" className="text-xl font-bold">Voorstellen ({open.length})</h2>
              {open.length > 1 && (
                <p className="text-sm">
                  Sorteer: <Link href={`/account/opdrachten/${job.id}`} className={sp.sorteer ? "link" : "font-semibold"}>binnenkomst</Link> ·{" "}
                  <Link href={`/account/opdrachten/${job.id}?sorteer=prijs`} className={sp.sorteer === "prijs" ? "font-semibold" : "link"}>prijs</Link>
                </p>
              )}
            </div>
            {open.length > 1 && (
              <div className="card mb-4 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <caption className="sr-only">Voorstellen naast elkaar</caption>
                  <thead className="text-muted"><tr><th className="p-3 font-medium">Professional</th><th className="p-3 font-medium">Prijs</th><th className="p-3 font-medium">Planning</th><th className="p-3 font-medium">Beoordeling</th><th className="p-3 font-medium">Afgerond</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {open.map((p) => (
                      <tr key={p.id}>
                        <th scope="row" className="p-3 font-semibold"><a href={`#v-${p.id}`} className="hover:underline">{p.provider?.display_name}</a></th>
                        <td className="p-3">{euro(p.amount_cents)}{p.price_type === "uur" ? " p/u" : ""}</td>
                        <td className="p-3">{p.planning || "–"}</td>
                        <td className="p-3">{stats[p.provider!.id]?.rating_count ? `${String(stats[p.provider!.id]!.rating_avg).replace(".", ",")} (${stats[p.provider!.id]!.rating_count})` : "Nieuw"}</td>
                        <td className="p-3">{stats[p.provider!.id]?.completed_as_provider ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {open.length === 0 ? (
              <Notice tone="info" title="Nog geen voorstellen">Professionals in deze categorie zien je opdracht. Tip: een duidelijke omschrijving en een foto helpen. Je opdracht sluit op {job.expires_at ? formatDate(job.expires_at) : "-"}.</Notice>
            ) : (
              <ul className="space-y-4">
                {open.map((p) => {
                  const st = p.provider ? stats[p.provider.id] : null;
                  const items = (portfolioItems ?? []).filter((it) => p.portfolio_item_ids.includes(it.id));
                  return (
                    <li key={p.id} id={`v-${p.id}`} className="card scroll-mt-24 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={publicUrl("avatars", p.provider?.avatar_path)} name={p.provider?.display_name ?? ""} size={48} />
                          <div>
                            <Link href={`/professionals/${p.provider?.username}`} className="font-semibold hover:underline">{p.provider?.display_name}</Link>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <Stars value={st?.rating_avg ?? null} count={st?.rating_count ?? 0} />
                              {p.provider?.kvk_verified_at && <VerifiedKvk />}
                              <span className="text-muted">{p.provider?.provider_type === "zakelijk" ? "Zakelijk" : "Particulier"}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-right"><span className="text-2xl font-extrabold">{euro(p.amount_cents)}</span><span className="block text-sm text-muted">{p.price_type === "uur" ? `per uur${p.estimated_hours ? ` · ca. ${p.estimated_hours} uur` : ""}` : "vaste prijs"}</span></p>
                      </div>
                      <p className="mt-4 whitespace-pre-line text-ink-soft">{p.message}</p>
                      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        {p.planning && <div><dt className="inline text-muted">Planning: </dt><dd className="inline">{p.planning}</dd></div>}
                        {p.available_from && <div><dt className="inline text-muted">Kan starten: </dt><dd className="inline">{formatDate(p.available_from)}</dd></div>}
                        <div><dt className="inline text-muted">Ontvangen: </dt><dd className="inline">{timeAgo(p.created_at)}</dd></div>
                        <div><dt className="inline text-muted">Via Jobmarkt afgerond: </dt><dd className="inline">{st?.completed_as_provider ?? 0}</dd></div>
                      </dl>
                      {items.length > 0 && (
                        <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label="Meegestuurd portfolio">
                          {items.map((it) => (
                            <li key={it.id} className="w-28 shrink-0 text-xs">
                              {it.image_path ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={publicUrl("portfolio", it.image_path) ?? ""} alt={it.title} className="aspect-square w-full rounded-lg object-cover" loading="lazy" />
                              ) : <div className="grid aspect-square place-items-center rounded-lg bg-sunken">Video</div>}
                              <span className="mt-1 block truncate">{it.title}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-5 flex flex-wrap items-start gap-3 border-t border-line pt-4">
                        <ActionForm action={acceptProposal} className="flex flex-wrap items-center gap-3">
                          <input type="hidden" name="id" value={p.id} />
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" required className="h-4 w-4 accent-[var(--color-accent)]" />
                            Ik kies {p.provider?.display_name?.split(" ")[0]}; de andere voorstellen worden gesloten
                          </label>
                          <SubmitButton>Accepteren</SubmitButton>
                        </ActionForm>
                        <form action={declineProposal}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="job" value={job.id} />
                          <button type="submit" className="btn-ghost">Niet kiezen</button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-muted hover:text-ink">Opdracht annuleren</summary>
              <ActionForm action={transitionJob} className="mt-3 max-w-md space-y-2">
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="to" value="geannuleerd" />
                <label htmlFor="cancel-note" className="label">Reden</label>
                <input id="cancel-note" name="note" required minLength={5} className="input" />
                <SubmitButton className="btn-danger">Annuleren</SubmitButton>
              </ActionForm>
            </details>
          </section>
        )}

        {["toegewezen", "bezig", "opgeleverd", "geschil", "afgerond"].includes(job.status) && (
          <section className="card p-5 sm:p-6" aria-labelledby="voortgang">
            <h2 id="voortgang" className="text-xl font-bold">Voortgang</h2>
            <p className="mt-1 text-ink-soft">
              {isClient ? <>Uitvoerder: <Link className="link" href={`/professionals/${other?.username}`}>{other?.display_name}</Link></> : <>Opdrachtgever: {other?.display_name}</>}
            </p>
            <ol className="mt-4 space-y-2 border-l-2 border-line pl-4 text-sm">
              {(history ?? []).map((h, i) => (
                <li key={i}><span className="font-semibold">{jobStatusLabel[h.to_status]}</span> <span className="text-muted">· {formatShort(h.created_at)}</span>{h.note ? <span className="block text-ink-soft">{h.note}</span> : null}</li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              {!isClient && job.status === "toegewezen" && <StatusAction id={job.id} to="bezig" label="Ik ben begonnen" />}
              {!isClient && job.status === "bezig" && <StatusAction id={job.id} to="opgeleverd" label="Markeer als opgeleverd" />}
              {isClient && job.status === "opgeleverd" && <StatusAction id={job.id} to="afgerond" label="Goedkeuren en afronden" />}
              {isClient && job.status === "opgeleverd" && <StatusAction id={job.id} to="bezig" label="Er moet nog iets gebeuren" secondary />}
            </div>
            {job.status === "geschil" && (
              <div className="mt-4"><Notice tone="warn" title="Geschil gemeld">Jobmarkt bekijkt de situatie en het gesprek en neemt contact op. Jullie kunnen intussen blijven overleggen.</Notice></div>
            )}
            {["toegewezen", "bezig", "opgeleverd"].includes(job.status) && (
              <details className="mt-5">
                <summary className="cursor-pointer text-sm text-muted hover:text-ink">Probleem? Geschil melden of annuleren</summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <ActionForm action={transitionJob} className="space-y-2">
                    <input type="hidden" name="id" value={job.id} />
                    <input type="hidden" name="to" value="geschil" />
                    <label htmlFor="dispute" className="label">Wat gaat er mis?</label>
                    <textarea id="dispute" name="note" required minLength={5} rows={3} className="input" />
                    <SubmitButton className="btn-secondary">Geschil melden</SubmitButton>
                  </ActionForm>
                  {job.status === "toegewezen" && (
                    <ActionForm action={transitionJob} className="space-y-2">
                      <input type="hidden" name="id" value={job.id} />
                      <input type="hidden" name="to" value="geannuleerd" />
                      <label htmlFor="cancel2" className="label">Reden voor annuleren</label>
                      <textarea id="cancel2" name="note" required minLength={5} rows={3} className="input" />
                      <SubmitButton className="btn-danger">Annuleren</SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </details>
            )}
          </section>
        )}

        {reviewOpen && (
          <section className="card p-5 sm:p-6" aria-labelledby="beoordelen">
            <h2 id="beoordelen" className="text-xl font-bold">Beoordeel {other?.display_name}</h2>
            <p className="mt-1 text-sm text-ink-soft">Jullie beoordelen elkaar blind: je ziet elkaars beoordeling pas als jullie allebei klaar zijn, of na 14 dagen.</p>
            <ReviewForm jobId={job.id} aboutProfessional={isClient} />
          </section>
        )}
        {job.status === "afgerond" && myReview && <Notice tone="ok" title="Je hebt deze opdracht beoordeeld" />}

        {!isClient || job.assigned_provider_id ? (
          <form action={blockUser} className="pt-2">
            <input type="hidden" name="id" value={isClient ? job.assigned_provider_id ?? "" : job.client_id} />
            <input type="hidden" name="on" value="1" />
            <input type="hidden" name="pad" value={`/account/opdrachten/${job.id}`} />
            <button type="submit" className="text-sm text-muted hover:text-danger hover:underline">{other?.display_name} blokkeren</button>
          </form>
        ) : null}
        {proposals.some((p) => p.status !== "verstuurd") && isClient && job.status !== "open" && (
          <p className="text-sm text-muted">{proposals.filter((p) => p.status !== "geaccepteerd").length} andere voorstel(len): {[...new Set(proposals.filter((p) => p.status !== "geaccepteerd").map((p) => proposalStatusLabel[p.status].toLowerCase()))].join(", ")}.</p>
        )}
      </div>
    </>
  );
}

function StatusAction({ id, to, label, secondary }: { id: string; to: string; label: string; secondary?: boolean }) {
  return (
    <ActionForm action={transitionJob}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
      <SubmitButton className={secondary ? "btn-secondary" : "btn-primary"}>{label}</SubmitButton>
    </ActionForm>
  );
}
