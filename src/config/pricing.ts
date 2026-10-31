// Eén plek voor prijzen en limieten zoals de site ze toont. De database
// dwingt dezelfde limieten af (app_settings 'plan_limits' en 'anti_spam');
// wijzig ze daar en hier tegelijk. Bedragen zijn producthypotheses, geen
// bewezen optimale prijzen (zie docs/verdienmodel.md).
export const VAT_RATE = 0.21;

export const plans = {
  gratis: {
    id: "gratis",
    name: "Gratis",
    priceCents: 0,
    proposalsPerMonth: 5,
    features: [
      "Volledig profiel met portfolio en diensten",
      "Alle passende openbare opdrachten bekijken",
      "5 nieuwe voorstellen per kalendermaand",
      "Geaccepteerde opdrachten afronden en bespreken, ook als je limiet op is",
      "Zoekopdrachten opslaan",
    ],
  },
  pro: {
    id: "pro",
    name: "Jobmarkt Pro",
    // incl. 21% btw; consumentenprijzen tonen we altijd inclusief btw
    priceCents: 1995,
    interval: "maand" as const,
    proposalsPerMonth: null,
    features: [
      "Geen maandlimiet op voorstellen (wel max. 15 per dag tegen spam)",
      "Meldingen bij nieuwe opdrachten die bij je zoekopdracht passen",
      "Profielstatistieken: voorstellen, acceptaties en afgeronde opdrachten",
      "Maandelijks opzegbaar, je houdt Pro tot het einde van de periode",
    ],
    notIncluded: [
      "Geen garantie op opdrachten",
      "Geen hogere positie in zoekresultaten",
      "Geen gekochte vertrouwensbadge",
      "Geen betaling per lead of contact",
    ],
  },
} as const;

export const antiSpam = {
  proposalsPerDay: 15,
  maxProposalsPerJob: 25,
  jobsPerDay: 5,
};

export function priceExVat(cents: number) {
  return Math.round(cents / (1 + VAT_RATE));
}
