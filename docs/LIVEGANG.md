# Livegang: wat er nog moet gebeuren

Status per onderdeel. Niets hiervan is al live gezet.

## Werkend en lokaal getest

- Volledige website (productiebuild) tegen een nagebootst Supabase met de echte migraties.
- 118 databasetests (RLS, statusmodel, limieten, reviews, minderjarigen, opslag, misbruik) en 84 end-to-end-controles via Chrome. Zie testrapport.md.
- Stripe-webhook: handtekening, idempotentie en server-side rechten getest met door Stripe's eigen bibliotheek ondertekende test-events.

## Geconfigureerd maar nog niet extern geverifieerd

- **Supabase Realtime** voor de chat (publicatie wordt in de migratie toegevoegd als `supabase_realtime` bestaat). Lokaal valt de chat terug op elke 5 seconden ophalen.
- **Supabase Auth-mails** (Nederlandse templates in `supabase/templates`, links via `/auth/bevestigen` met `token_hash`).
- **Stripe Checkout en klantportaal** (code staat, nooit tegen Stripe zelf aangeroepen).
- **App-mails via Resend** (ouderlijke toestemming, zoekmeldingen) en de **dagelijkse taak** (`vercel.json`).
- **robots.txt/sitemap** op het echte domein.

## Geblokkeerd door ontbrekende toegang of besluit

1. **Supabase-project aanmaken** in organisatie "jobmarkt". Je account heeft al twee actieve gratis projecten (mococha, denra); een derde gratis project kan Supabase weigeren. Kies: een project pauzeren, of de organisatie op Pro zetten (betaald). Regio: `eu-central-1` (Frankfurt) of `eu-west-*`.
2. **Migraties toepassen** (additief, geen resets):
   ```bash
   supabase link --project-ref <ref>
   supabase db push            # past supabase/migrations toe
   supabase config push        # auth-instellingen en Nederlandse mailtemplates
   ```
   Daarna in het dashboard: Auth → URL-configuratie op het definitieve domein; SMTP instellen (Supabase's standaard-SMTP is alleen voor testen en sterk gelimiteerd).
3. **Eerste beheerder**: na je eigen aanmelding in de SQL-editor:
   `insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = '<jouw e-mail>';`
4. **Repository hernoemen** naar `jobmarkt`: door de eigenaar van `wxnderinfo-lab` (Settings → Repository name). GitHub stuurt oude URL's door; daarna lokaal `git remote set-url origin https://github.com/wxnderinfo-lab/jobmarkt.git`. Er zijn geen CI-workflows of webhooks in de repo die moeten mee.
5. **Branch pushen en preview**: `feat/jobmarkt` staat alleen lokaal (worktree `Documents/GitHub/jobmarkt`). Na jouw akkoord: push, Vercel-project koppelen, env-variabelen zetten (README), preview bekijken.
6. **Domein** kiezen en `NEXT_PUBLIC_SITE_URL` zetten; `supabase/config.toml` `site_url` aanpassen.
7. **Juridische exploitant** invullen (`NEXT_PUBLIC_OPERATOR_*`) en de conceptteksten laten toetsen (juridisch-te-toetsen.md). CHAS staat nu alleen als maker in de footer.
8. **Stripe**: eerst testmodus met een testprijs "Jobmarkt Pro, € 19,95 incl. btw per maand", klantportaal inschakelen (opzeggen aan), webhook naar `/api/stripe/webhook` met events `checkout.session.completed` en `customer.subscription.*`. **Live zetten alleen na je expliciete akkoord.** Advies: `BILLING_ENABLED` uit laten en starten met de introductieperiode (zie verdienmodel.md).
9. **Resend** (of andere provider) met eigen afzenderdomein voor app-mails; `RESEND_API_KEY`, `EMAIL_FROM`.
10. **Search Console en Bing Webmaster Tools** op het definitieve domein (zie seo/google-zonder-business-profiel.md).

## Bewust later gepland

- Ingebouwd bellen (WebRTC/telefonie): eerst de echte belknop (tel:) na vrijwillig delen. Alleen toevoegen als er aantoonbaar vraag is.
- Betalingen via het platform (escrow/marketplace-betalingen): pas na juridische en DAC7-toets, zie verdienmodel.md.
- Jobmarkt Business (teams): pas bij vraag.
- Identiteitsverificatie (bijv. iDIN): nu alleen KVK-controle door beheer.
- Lokale landingspagina's per stad × categorie: pas als er per combinatie echt aanbod is.
- Meertaligheid en andere landen: datamodel heeft `country_code` op plaatsen en `languages` op profielen; verder niets gebouwd.
