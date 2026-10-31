# SEO-audit Jobmarkt (31 oktober 2026)

Gemeten op de productiebuild, lokaal (`next start`), tegen een lokale database met testdata uit de end-to-end-test. Het definitieve domein bestaat nog niet; alles hieronder over Google zelf is dus nog niet extern geverifieerd.

## Uitgangssituatie (Spotr)

| Probleem | Ernst |
| --- | --- |
| Client-side SPA: HTML bevatte alleen `<div id="root">` | Kritiek: inhoud niet crawlbaar zonder JavaScript |
| Eén `<title>` en canonical voor alle URL's (`https://spotr.app`) | Kritiek |
| Statische sitemap met niet-bestaande URL's; robots zonder onderscheid | Hoog |
| Geen 404-status (alles 200 via de router) | Hoog |
| Engelstalige inhoud voor een Nederlandse markt; `lang="en"` | Hoog |
| Verzonnen aantallen en reviews | Hoog (vertrouwen, misleiding) |
| Google Analytics zonder toestemming | Privacy |

## Opgelost en getest

| Onderdeel | Implementatie | Bewijs |
| --- | --- | --- |
| Server-rendered HTML | Next.js App Router; openbare pagina's renderen op de server | E2E: 7 openbare pagina's met JavaScript uit geven 200 en een h1 |
| Unieke titels en descriptions | `generateMetadata` per pagina, template `%s | Jobmarkt` | Curl-controle van alle openbare routes |
| Canonicals | Per pagina; gefilterde zoekpagina's canoniek naar de basis-URL | Curl-controle |
| Trailing slash | Geen trailing slash (`trailingSlash: false`, 308 naar zonder) | next.config.ts |
| Facetten/filters | Elke filtercombinatie `noindex, follow`, canoniek naar `/opdrachten` of `/professionals`; niet geblokkeerd in robots.txt (anders ziet Google de noindex niet) | Curl: `/opdrachten?categorie=…` geeft `noindex, follow` |
| Dunne pagina's | Subcategorieën zonder aanbod en profielen zonder beschrijving krijgen `noindex, follow` en staan niet in de sitemap | Curl + sitemap.ts |
| Privépagina's | `/account`, `/berichten`, `/beheer`, `/welkom`, `/toestemming`, `/auth/*`: `X-Robots-Tag: noindex, nofollow` en meta-robots; achter inloggen | next.config.ts headers |
| robots.txt | Productie: alleen routes zonder inhoud voor crawlers geblokkeerd; previews en lokaal: alles geblokkeerd | robots.ts |
| XML-sitemap | Alleen canonieke, indexeerbare URL's: open opdrachten, profielen met inhoud, actieve diensten, artikelen, categorieën met aanbod. Elk uur ververst | sitemap.ts |
| Statuscodes | Echte 404 voor onbekende opdrachten/profielen/diensten; 308 permanente redirects voor oude Spotr-routes | Curl: `/opdrachten/nep-12345678` → 404, `/jobs` → 308 |
| Verlopen/gesloten opdrachten | Pagina blijft 200 voor deelnemers met melding "staat niet meer open", maar `noindex`; uit de sitemap; geannuleerde/verwijderde → 404 | Code + e2e |
| Breadcrumbs | Zichtbaar + `BreadcrumbList` | Op alle openbare detailpagina's |
| Interne links | Categorieën ↔ opdrachten ↔ professionals ↔ kennisbank; footer met kernpagina's | Handmatig |
| Structured data | `Organization` + `WebSite` (sitebreed), `BreadcrumbList`, `ProfilePage`/`Person` (profielen), `Service` (diensten), `Article` (kennisbank). **Geen** `JobPosting`, geen `AggregateRating`, geen `FAQPage` | Zie onder |
| Gebruikerslinks | Videolinks in portfolio: `rel="ugc nofollow noopener noreferrer"`; links in opdrachten/voorstellen/vragen worden tegengehouden (moderatie) | Code + DB-tests |
| Afbeeldingen | Bij upload in de browser verkleind naar WebP (max. 1600 px; avatar 400 px), EXIF/GPS verwijderd; `loading="lazy"`, vaste afmetingen, alt-teksten | e2e: geen `img` zonder alt |
| Lettertype | Zelf gehost via `next/font` (geen request naar Google bij bezoek), `display: swap`, latin + latin-ext | layout.tsx |
| Scripts | Geen analytics of tag-managers; alleen het eigen Next.js-bundel (± 250 KiB totaal, gemeten) | Lighthouse |
| Taal | `lang="nl"`, Nederlandse inhoud en URL's | e2e |
| Mobiel | Responsief, onderbalk, geen horizontale scroll | Screenshots, e2e |

### Gemeten prestaties

Lighthouse 13.5.0, mobiel profiel (gesimuleerde trage 4G, 4× CPU-vertraging), lokale productiebuild, Windows 11, headless Chrome:

| Pagina | Performance | Toegankelijkheid | Best practices | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 97 | 100 | 100 | 2,7 s | 20 ms | 0 |
| `/opdrachten` | 98 | 100 | 100 | 2,5 s | 20 ms | 0 |
| `/professionals/<profiel>` | 98 | 100 | 100 | 2,5 s | 20 ms | 0 |
| `/kennisbank/professional-kiezen` | 98 | 100 | 100 | 2,5 s | 30 ms | 0 |

De SEO-score was lokaal 66 omdat robots.txt op niet-productie alles blokkeert (bewust). Dit zijn labmetingen op localhost zonder CDN; echte Core Web Vitals (veldgegevens) komen pas uit Search Console/CrUX na livegang.

## Bewuste keuzes rond Google-functies

- **JobPosting en de Indexing API worden niet gebruikt.** Google staat JobPosting alleen toe voor echte vacatures op een pagina per vacature, en niet voor aanbiedingen van iemand die zelf werk aanbiedt. De Indexing API is volgens Google alleen voor pagina's met JobPosting of BroadcastEvent. Een opdracht ("schilder de woonkamer") is geen vacature voor een dienstverband. Als Jobmarkt ooit echte vacatures toevoegt, moet per pagina beoordeeld worden of die onder het beleid valt.
- **Geen review-sterren in structured data.** Google toont geen review-snippets voor beoordelingen die een organisatie over zichzelf publiceert (self-serving) en beoordelingen van personen vallen niet onder de ondersteunde typen. De sterren staan alleen zichtbaar op de pagina.
- **Geen FAQ-markup.** FAQ-rich results zijn sinds 2023 beperkt tot gezaghebbende overheids- en zorgsites.
- **Geen garanties** over posities of rich results.

## Resterende acties

1. Definitief domein, `NEXT_PUBLIC_SITE_URL`, en controleren dat robots.txt op productie indexeren toestaat.
2. Search Console (domeineigendom via DNS), sitemap indienen, URL-inspectie van home en enkele detailpagina's.
3. Bing Webmaster Tools; IndexNow overwegen voor nieuwe opdrachten (Bing/Yandex; Google ondersteunt IndexNow niet).
4. Veld-CWV volgen in Search Console zodra er verkeer is.
5. Na 4–8 weken: controleren welke opdracht- en profielpagina's geïndexeerd worden en of `noindex` op dunne pagina's goed uitpakt.
6. Kennisbank uitbreiden volgens plan-30-60-90.md, met echte auteur(s).
