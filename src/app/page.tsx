import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Search, ShieldCheck, Euro, MessagesSquare, Sparkles, Star, Sprout, MapPin } from "lucide-react";
import { getCategoryTree, searchJobs } from "@/lib/data";
import { heroPhoto } from "@/config/photos";
import { CategoryTile } from "@/components/CategoryTile";
import { JobCard } from "@/components/cards";
import { WaitlistForm } from "@/components/WaitlistForm";
import { plans } from "@/config/pricing";
import { euro } from "@/lib/format";

export const metadata: Metadata = {
  title: { absolute: "Jobmarkt: opdracht plaatsen of werk vinden, lokaal en online" },
  description:
    "Plaats gratis een opdracht en ontvang voorstellen van professionals, of vind werk in jouw vak. Van schilderen en verhuizen tot video-editing en websites. Geen kosten per contact.",
  alternates: { canonical: "/" },
};

const reasons = [
  { icon: MapPin, title: "Lokaal én online", text: "Een schilder in je eigen stad of een video-editor waar dan ook: alles op één plek." },
  { icon: Euro, title: "Geen kosten per contact", text: "Plaatsen en kiezen is gratis. Professionals betalen nooit per lead of per gedeeld nummer." },
  { icon: Sparkles, title: "Uitlegbare matching", text: "Je ziet waarom een opdracht of professional bovenaan staat: vak, afstand, budget en beschikbaarheid." },
  { icon: Star, title: "Echte beoordelingen", text: "Alleen na een afgeronde opdracht via Jobmarkt, door de twee mensen die samenwerkten." },
  { icon: MessagesSquare, title: "Van vraag tot afronding", text: "Vragen stellen, voorstellen vergelijken, privé chatten na de keuze en samen afronden." },
  { icon: Sprout, title: "Ruimte voor starters", text: "Nieuw zonder reviews? Je portfolio, uitleg en planning tellen ook mee." },
];

export default async function HomePage() {
  const [tree, latest] = await Promise.all([getCategoryTree(), searchJobs({}, 6)]);

  return (
    <>
      <section className="border-b border-line">
        <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow mb-3">Opdrachten en vakmensen in Nederland</p>
            <h1 className="text-4xl font-extrabold sm:text-5xl">
              Iets laten doen of werk vinden? <span className="text-accent">Regel het hier.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">
              Plaats gratis je opdracht en kies zelf uit voorstellen. Of laat als professional zien wat je kunt en reageer op werk dat bij je past.
            </p>
            <form action="/professionals" method="get" role="search" className="card mt-7 flex flex-col gap-2 p-2 sm:flex-row">
              <label htmlFor="home-q" className="sr-only">Waar zoek je hulp bij?</label>
              <div className="flex flex-1 items-center gap-2 px-2">
                <Search className="h-5 w-5 text-muted" aria-hidden />
                <input id="home-q" name="q" placeholder="Bijv. schilder, video-editor, verhuizen" className="min-h-11 w-full bg-transparent text-base outline-none placeholder:text-muted/80" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button type="submit" className="btn-primary whitespace-nowrap px-3">Vind een professional</button>
                <button type="submit" formAction="/opdrachten" className="btn-secondary whitespace-nowrap px-3">Vind werk</button>
              </div>
            </form>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/opdracht-plaatsen" className="btn-primary">
                Plaats een opdracht <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <span className="text-sm text-muted">Gratis, zonder account rondkijken</span>
            </div>
          </div>
          <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-sunken lg:aspect-[4/5]">
            <Image src={heroPhoto.src} alt={heroPhoto.alt} fill priority sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />
          </div>
          <div className="card relative -mt-16 mx-3 p-6 shadow-lg sm:mx-6 lg:absolute lg:-bottom-8 lg:-left-10 lg:mx-0 lg:mt-0 lg:max-w-sm">
            <h2 className="text-lg font-bold">Zo werkt het</h2>
            <ol className="mt-4 space-y-4">
              {[
                ["Beschrijf je opdracht", "Titel, wat er moet gebeuren, waar en wanneer. Je ziet alles terug voordat het online gaat."],
                ["Vergelijk voorstellen", "Prijs, planning en eerder werk naast elkaar. Stel vragen zonder je nummer te delen."],
                ["Kies en regel het samen", "Na je keuze open je een privégesprek. Na afronding beoordelen jullie elkaar."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-paper">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-ink-soft">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/hoe-het-werkt" className="link mt-5 inline-block text-sm">Meer over hoe het werkt</Link>
          </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14" aria-labelledby="categorieen">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="categorieen" className="text-2xl font-extrabold">Waar kunnen we mee helpen?</h2>
          <Link href="/categorieen" className="link shrink-0 text-sm">Alle categorieën</Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {tree.map((c) => (
            <li key={c.id}><CategoryTile c={c} /></li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-surface py-14" aria-labelledby="nieuw">
        <div className="container-page">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id="nieuw" className="text-2xl font-extrabold">Nieuwe opdrachten</h2>
            {latest.total > 0 && <Link href="/opdrachten" className="link shrink-0 text-sm">Alle opdrachten</Link>}
          </div>
          {latest.rows.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {latest.rows.map((j) => <JobCard key={j.id} job={j} />)}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-lg font-semibold">Jobmarkt is net begonnen.</p>
                <p className="mt-2 text-ink-soft">
                  Er staan nog geen openbare opdrachten online. Dat zeggen we liever eerlijk dan dat we voorbeelden verzinnen.
                  Heb je iets te doen? Dan is jouw opdracht de eerste die professionals zien.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/opdracht-plaatsen" className="btn-primary">Plaats de eerste opdracht</Link>
                  <Link href="/aanmelden?rol=professional" className="btn-secondary">Maak je profiel als professional</Link>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold">Laat het weten als er aanbod is</h3>
                <p className="mb-4 mt-1 text-sm text-ink-soft">Eén e-mail zodra er in jouw branche opdrachten of professionals zijn.</p>
                <WaitlistForm categories={tree} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="container-page py-14" aria-labelledby="waarom">
        <h2 id="waarom" className="mb-8 text-2xl font-extrabold">Waarom Jobmarkt</h2>
        <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-ink-soft">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page pb-6" aria-labelledby="prijzen-kort">
        <div className="card grid gap-8 p-6 sm:p-8 lg:grid-cols-3">
          <div>
            <h2 id="prijzen-kort" className="text-2xl font-extrabold">Eerlijk geprijsd</h2>
            <p className="mt-2 text-ink-soft">Geen verborgen kosten, geen betaling per contact.</p>
          </div>
          <div>
            <p className="eyebrow">Opdrachtgevers</p>
            <p className="mt-1 text-xl font-bold">Gratis</p>
            <p className="mt-1 text-sm text-ink-soft">Plaatsen, voorstellen bekijken en kiezen kost niets.</p>
          </div>
          <div>
            <p className="eyebrow">Professionals</p>
            <p className="mt-1 text-xl font-bold">Gratis of Pro voor {euro(plans.pro.priceCents, true)} p/m</p>
            <p className="mt-1 text-sm text-ink-soft">
              Gratis: {plans.gratis.proposalsPerMonth} voorstellen per maand. Pro: geen maandlimiet. <Link className="link" href="/prijzen">Bekijk de verschillen</Link>
            </p>
          </div>
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Telefoonnummers en adressen zijn nooit openbaar. Contact delen kan pas na je keuze, en alleen als jij dat wilt.
        </p>
      </section>
    </>
  );
}
