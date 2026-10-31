import Link from "next/link";
import type { ReactNode } from "react";
import { Star, BadgeCheck, CircleAlert, Info, CheckCircle2 } from "lucide-react";

export function PageHeader({ eyebrow, title, intro, actions }: { eyebrow?: string; title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {intro && <div className="mt-3 text-lg text-ink-soft">{intro}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-start gap-3 border-dashed p-6 sm:p-8">
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <div className="max-w-xl text-ink-soft">{children}</div>}
      {action && <div className="mt-1 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "ok" | "warn" | "danger"; title?: string; children?: ReactNode }) {
  const styles = {
    info: "border-accent/30 bg-accent-soft text-ink",
    ok: "border-ok/30 bg-ok-soft text-ink",
    warn: "border-warn/30 bg-warn-soft text-ink",
    danger: "border-danger/30 bg-danger-soft text-ink",
  }[tone];
  const Icon = { info: Info, ok: CheckCircle2, warn: CircleAlert, danger: CircleAlert }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex gap-3 rounded-xl border p-4 text-sm ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-1 text-ink-soft" : ""}>{children}</div>}
      </div>
    </div>
  );
}

export function Stars({ value, count, size = "sm" }: { value: number | null; count?: number; size?: "sm" | "md" }) {
  if (!count || value === null) {
    return <span className="text-sm text-muted">Nog geen beoordelingen</span>;
  }
  const s = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`${s} ${i <= Math.round(value) ? "fill-ink text-ink" : "text-line-strong"}`} />
        ))}
      </span>
      <span className="font-semibold">{value.toFixed(1).replace(".", ",")}</span>
      <span className="text-muted">({count} {count === 1 ? "beoordeling" : "beoordelingen"})</span>
      <span className="sr-only">Gemiddeld {value.toFixed(1)} van 5 sterren uit {count} beoordelingen van afgeronde opdrachten</span>
    </span>
  );
}

export function VerifiedKvk() {
  return (
    <span className="chip border-ok/30 text-ok" title="KVK-inschrijving gecontroleerd door Jobmarkt">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> KVK gecontroleerd
    </span>
  );
}

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "ok" | "warn" | "danger" | "accent" }) {
  const styles = {
    neutral: "bg-sunken text-ink-soft",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent-soft text-accent-strong",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{label}</span>;
}

export function jobStatusTone(status: string): "neutral" | "ok" | "warn" | "danger" | "accent" {
  if (status === "open") return "accent";
  if (status === "afgerond") return "ok";
  if (status === "geschil") return "danger";
  if (["toegewezen", "bezig", "opgeleverd"].includes(status)) return "warn";
  return "neutral";
}

export function Avatar({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  const initials = (name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    // geüploade avatars zijn bij uploaden al verkleind naar webp
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full border border-line bg-sunken object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-sunken font-bold text-ink-soft" style={{ width: size, height: size, fontSize: size / 2.8 }}>
      {initials}
    </span>
  );
}

export function Pagination({ page, total, perPage, hrefFor }: { page: number; total: number; perPage: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Paginering" className="mt-8 flex items-center justify-between gap-3">
      {page > 1 ? <Link className="btn-secondary" href={hrefFor(page - 1)} rel="prev">Vorige</Link> : <span />}
      <span className="text-sm text-muted">Pagina {page} van {pages}</span>
      {page < pages ? <Link className="btn-secondary" href={hrefFor(page + 1)} rel="next">Volgende</Link> : <span />}
    </nav>
  );
}

export function Field({ label, htmlFor, hint, error, children, optional }: { label: string; htmlFor: string; hint?: ReactNode; error?: string; children: ReactNode; optional?: boolean }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label} {optional && <span className="font-normal text-muted">(optioneel)</span>}
      </label>
      {children}
      {hint && !error && <p className="hint" id={`${htmlFor}-hint`}>{hint}</p>}
      {error && <p className="mt-1 text-sm font-medium text-danger" id={`${htmlFor}-error`}>{error}</p>}
    </div>
  );
}
