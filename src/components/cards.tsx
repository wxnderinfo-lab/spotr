import Link from "next/link";
import { MapPin, Monitor, Clock, Users, Sparkles } from "lucide-react";
import type { JobRow, ProRow } from "@/lib/data";
import { jobHref } from "@/lib/data";
import { budgetLabel, euro, timeAgo, timingLabel, availabilityLabel } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { Avatar, Stars, VerifiedKvk } from "./ui";

export function JobCard({ job, showMatch }: { job: JobRow; showMatch?: boolean }) {
  return (
    <article className="card relative p-5 transition-colors hover:border-line-strong">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="chip">{job.category_name}</span>
        <span>{timeAgo(job.published_at)}</span>
      </div>
      <h3 className="text-lg font-bold">
        <Link href={jobHref(job)} className="after:absolute after:inset-0 hover:underline focus:outline-none">
          {job.title}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-ink-soft">{job.excerpt}</p>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Waar</dt>
          {job.work_mode === "online" ? <Monitor className="h-4 w-4" aria-hidden /> : <MapPin className="h-4 w-4" aria-hidden />}
          <dd>{job.work_mode === "online" ? "Online" : job.place_name}{job.distance_km !== null && job.work_mode !== "online" ? ` · ${job.distance_km} km` : ""}</dd>
        </div>
        <div><dt className="sr-only">Budget</dt><dd className="font-semibold text-ink">{budgetLabel(job.budget_type, job.budget_min_cents, job.budget_max_cents)}</dd></div>
        <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden /><dt className="sr-only">Wanneer</dt><dd>{timingLabel[job.timing]}</dd></div>
        <div className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden /><dt className="sr-only">Voorstellen</dt><dd>{job.proposal_count === 0 ? "Nog geen voorstellen" : `${job.proposal_count} voorstel${job.proposal_count === 1 ? "" : "len"}`}</dd></div>
      </dl>
      {showMatch && job.match_reasons.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-accent-strong">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span><span className="sr-only">Waarom je dit ziet: </span>{job.match_reasons.join(" · ")}</span>
        </p>
      )}
    </article>
  );
}

export function ProCard({ pro }: { pro: ProRow }) {
  return (
    <article className="card relative flex gap-4 p-5 transition-colors hover:border-line-strong">
      <Avatar src={publicUrl("avatars", pro.avatar_path)} name={pro.display_name} size={56} />
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold">
          <Link href={`/professionals/${pro.username}`} className="after:absolute after:inset-0 hover:underline">
            {pro.display_name}
          </Link>
        </h3>
        {pro.headline && <p className="truncate text-ink-soft">{pro.headline}</p>}
        <div className="mt-1.5"><Stars value={pro.rating_avg} count={pro.rating_count} /></div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="chip">{pro.provider_type === "zakelijk" ? "Zakelijk" : "Particulier"}</span>
          {pro.kvk_verified && <VerifiedKvk />}
          {pro.place_name && pro.works_on_location && <span className="chip"><MapPin className="h-3 w-3" aria-hidden />{pro.place_name}{pro.distance_km !== null ? ` · ${pro.distance_km} km` : ""}</span>}
          {pro.works_online && <span className="chip"><Monitor className="h-3 w-3" aria-hidden />Online</span>}
          <span className="chip">{availabilityLabel[pro.availability]}</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          {pro.hourly_rate_cents ? <>Vanaf <span className="font-semibold text-ink">{euro(pro.hourly_rate_cents)}</span> per uur · </> : null}
          {pro.completed_count > 0 ? `${pro.completed_count} afgeronde opdracht${pro.completed_count === 1 ? "" : "en"} via Jobmarkt` : "Nieuw op Jobmarkt"}
        </p>
      </div>
    </article>
  );
}
