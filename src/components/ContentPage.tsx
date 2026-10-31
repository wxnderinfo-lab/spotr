import type { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { Notice } from "./ui";
import { operatorKnown, site } from "@/config/site";

export function ContentPage({ title, intro, crumb, children, legal, updated }: {
  title: string; intro?: ReactNode; crumb: string; children: ReactNode; legal?: boolean; updated?: string;
}) {
  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumbs items={[{ name: crumb }]} />
      <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
      {intro && <div className="mt-3 text-lg text-ink-soft">{intro}</div>}
      {legal && (
        <div className="mt-6">
          <Notice tone="warn" title="Concepttekst, nog niet juridisch getoetst">
            Deze tekst beschrijft hoe Jobmarkt werkt, maar is nog niet door een jurist beoordeeld en wordt vóór de officiële lancering definitief gemaakt.
            {!operatorKnown() && " De gegevens van de juridische exploitant (naam, KVK-nummer, adres) worden dan ook ingevuld."}
          </Notice>
        </div>
      )}
      {updated && <p className="mt-4 text-sm text-muted">Versie {site.termsVersion} · laatst bijgewerkt {updated}</p>}
      <div className="prose-jm mt-8">{children}</div>
    </div>
  );
}

export function OperatorLine() {
  return operatorKnown() ? (
    <>{site.operator.legalName}{site.operator.kvk ? `, KVK ${site.operator.kvk}` : ""}{site.operator.email ? `, ${site.operator.email}` : ""}</>
  ) : (
    <strong>[exploitant: nog in te vullen vóór lancering]</strong>
  );
}
