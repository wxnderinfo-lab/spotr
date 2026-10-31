const euro0 = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const euro2 = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

export function euro(cents: number | null | undefined, decimals = false) {
  if (cents === null || cents === undefined) return "";
  return (decimals || cents % 100 !== 0 ? euro2 : euro0).format(cents / 100);
}

export function budgetLabel(type: string, min: number | null, max: number | null) {
  if (type === "in_overleg") return "Budget in overleg";
  const suffix = type === "uur" ? " per uur" : "";
  if (min && max && min !== max) return `${euro(min)} – ${euro(max)}${suffix}`;
  const v = max ?? min;
  return v ? `${type === "uur" ? "" : "Tot "}${euro(v)}${suffix}` : "Budget in overleg";
}

const dateFmt = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });
const shortFmt = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });
const timeFmt = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

export const formatDate = (d: string | Date) => dateFmt.format(new Date(d));
export const formatShort = (d: string | Date) => shortFmt.format(new Date(d));
export const formatTime = (d: string | Date) => timeFmt.format(new Date(d));

export function timeAgo(d: string | Date) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "zojuist";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min geleden`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} uur geleden`;
  const days = Math.round(h / 24);
  if (days === 1) return "gisteren";
  if (days < 30) return `${days} dagen geleden`;
  return formatDate(d);
}

export const timingLabel: Record<string, string> = {
  zo_snel_mogelijk: "Zo snel mogelijk",
  voor_datum: "Vóór een datum",
  op_datum: "Op een vaste datum",
  flexibel: "Flexibel",
};

export const workModeLabel: Record<string, string> = {
  op_locatie: "Op locatie",
  online: "Online",
  beide: "Online en op locatie",
};

export const jobStatusLabel: Record<string, string> = {
  concept: "Concept",
  open: "Open voor voorstellen",
  toegewezen: "Toegewezen",
  bezig: "Bezig",
  opgeleverd: "Opgeleverd",
  afgerond: "Afgerond",
  geannuleerd: "Geannuleerd",
  geschil: "Geschil",
  verlopen: "Verlopen",
  verwijderd: "Verwijderd",
};

export const proposalStatusLabel: Record<string, string> = {
  verstuurd: "Verstuurd",
  ingetrokken: "Ingetrokken",
  geaccepteerd: "Geaccepteerd",
  afgewezen: "Niet gekozen",
  gesloten: "Gesloten",
};

export const availabilityLabel: Record<string, string> = {
  beschikbaar: "Beschikbaar",
  beperkt: "Beperkt beschikbaar",
  niet_beschikbaar: "Niet beschikbaar",
};

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** PostgREST geeft een één-op-één-relatie zonder gegenereerde types als array of object terug. */
export function rel<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}
