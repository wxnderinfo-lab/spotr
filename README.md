# Jobmarkt

Nederlandstalig platform waar mensen opdrachten plaatsen en werk vinden, lokaal én online. Voortgebouwd op Spotr (zelfde repository, zwart-wit stijl en beeldmerk met punt), opnieuw opgezet op Next.js zodat openbare pagina's server-side renderen.

- **Opdrachtgevers**: gratis opdracht plaatsen (concept wordt bewaard tot na aanmelden), voorbeeld vóór publicatie, openbare vragen zonder contactgegevens, voorstellen vergelijken, atomair accepteren, privégesprek, afronden en beoordelen.
- **Professionals**: profiel met portfolio, diensten, beschikbaarheid en tarief; uitlegbare matching; 5 voorstellen per maand gratis of onbeperkt met Pro (anti-spamgrenzen gelden voor iedereen).
- **Vertrouwen**: dubbelblinde beoordelingen alleen na afgeronde opdrachten, KVK-controle door beheer, melden/blokkeren, moderatie met motivering en bezwaar, auditlog.
- **16+**: geboortedatum privé; 16/17-jarigen alleen met ouderlijke toestemming; 18+-categorieën; geen betaalde functies onder 18.

## Stack

Next.js 16 (App Router, server components en server actions), React 19, Tailwind CSS 4, Supabase (Postgres + RLS, Auth, Storage, Realtime), Stripe (alleen abonnement, testmodus), Vercel. Lettertype Schibsted Grotesk (SIL OFL 1.1) via `next/font`.

## Lokaal draaien en testen (zonder echt Supabase-project)

```bash
npm install
npm run test:db                                   # 118 database- en misbruiktests (PGlite)
node tools/local-supabase/server.mjs              # nagebootst Supabase op :54321 (schone database)
node tools/local-supabase/next-local.mjs build
node tools/local-supabase/next-local.mjs start    # productiebuild op :3100
node tools/local-supabase/e2e.mjs                 # 84 end-to-end-controles via Chrome
```

De gateway heeft de PostgREST-binary nodig (`tools/local-supabase/bin/postgrest.exe` of `POSTGREST_BIN`). Bevestigingsmails staan op `http://localhost:54321/_mailbox`. Lokaal beheeraccount: zie `tools/local-supabase/seed.sql` (alleen voor de testgateway). Realtime wordt lokaal niet nagebootst; de chat haalt dan elke 5 seconden op.

## Omgevingsvariabelen

| Variabele | Waar | Doel |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Supabase-project |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (alleen server) | Webhook, account verwijderen, dagelijkse taak |
| `NEXT_PUBLIC_SITE_URL` | Vercel | Definitief domein (canonicals, sitemap, mails) |
| `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_OPERATOR_KVK`, `NEXT_PUBLIC_CONTACT_EMAIL` | Vercel | Juridische exploitant (leeg = placeholder op juridische pagina's) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `BILLING_ENABLED` | Vercel | Pro-abonnement; zonder `BILLING_ENABLED=true` geen afrekenknop |
| `RESEND_API_KEY`, `EMAIL_FROM` | Vercel | App-mails (toestemming ouder, zoekmeldingen) |
| `CRON_SECRET` | Vercel | Beveiliging van `/api/cron/daily` |
| `ALLOW_INDEXING` | Vercel | `true` alleen op productie als `VERCEL_ENV` niet `production` is |

## Documentatie

- [docs/inventarisatie.md](docs/inventarisatie.md): wat er in Spotr zat en wat is behouden
- [docs/LIVEGANG.md](docs/LIVEGANG.md): exact wat er nog live moet gebeuren
- [docs/verdienmodel.md](docs/verdienmodel.md): product- en verdienmodeladvies
- [docs/concurrentie.md](docs/concurrentie.md): Werkspot, Fiverr en alternatieven
- [docs/seo/](docs/seo/): audit, zoekintentie- en keywordmap, 30/60/90-plan, Google zonder Business-profiel
- [docs/meetplan.md](docs/meetplan.md): wat we meten en hoe
- [docs/juridisch-te-toetsen.md](docs/juridisch-te-toetsen.md): punten voor juridische beoordeling
- [docs/beheer.md](docs/beheer.md): handleiding beheeromgeving
- [docs/testrapport.md](docs/testrapport.md): wat getest is, met resultaten
- [docs/bronnen.md](docs/bronnen.md): bronnen en onderzoeksdatum
