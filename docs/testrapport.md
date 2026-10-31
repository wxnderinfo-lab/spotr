# Testrapport (31 oktober 2026)

Omgeving: Windows 11, Node 24.13, Next.js 16.4.2 productiebuild (`next start`), lokale Supabase-nabootsing (PGlite/Postgres 17.5 + PostgREST 16.5 + auth/storage-stub), Chrome headless via puppeteer-core. **Niet getest tegen een echt Supabase-project, echte Stripe of echte e-mail.**

## Database (`npm run test:db`): 118 geslaagd, 0 mislukt

Alle migraties worden twee keer toegepast (veilig herhaalbaar). Getest per rol (anon, ingelogd, admin) met echte RLS:

- Profielen: privégegevens afgeschermd (ook token-hash), geboortedatum niet wijzigbaar, leeftijd minderjarige nooit openbaar, status/verificatie niet zelf te zetten, andermans profiel niet te wijzigen, geen zelf-admin, geen zelf-abonnement, geen meldingen voor anderen.
- Opdrachten: geen directe statuswijziging, geen opdracht namens ander, concept niet openbaar, minderjarige zonder toestemming kan niet publiceren, contactgegevens/links → moderatie, ook bij latere bewerking.
- Voorstellen: alleen in eigen categorieën, niet op eigen opdracht, geen dubbel, geen contactgegevens, maandlimiet gratis (6e geweigerd), Pro via abonnement of introductieperiode, verlopen abonnement → geen Pro.
- Accepteren: alleen opdrachtgever, tweede acceptatie geweigerd, overige voorstellen gesloten met melding, **unieke index voorkomt twee geaccepteerde voorstellen ook buiten de functie om**.
- Gesprek: alleen deelnemers lezen/schrijven, geen bericht namens ander of vervalst systeembericht, bijlage alleen uit eigen gesprek, telefoonnummer delen/intrekken, moderator alleen bij open melding.
- Statusmodel: alleen toegestane overgangen per rol, geschiedenis vastgelegd.
- Reviews: alleen deelnemers van afgeronde opdracht, één per persoon, geen zelfreview, dubbelblind, gemiddelde uit gepubliceerde reviews, reactie alleen door beoordeelde.
- Moderatie: alleen moderators, auditlog, gemotiveerd besluit aan melder, meldlimiet per dag, blokkeren.
- Minderjarige: toestemmingslink, verkeerde token geweigerd, na toestemming wel, 18+-categorie blijft dicht.
- Zoeken: categorie, afstand, online, matchredenen, reviews uit gepubliceerde data.
- Account: verwijderen geblokkeerd tijdens lopende opdracht; export zonder geheimen.
- Opslag: eigen map, chatbijlagen alleen voor deelnemers, anon niet.

**Beperking**: gelijktijdige acceptatie is niet écht parallel getest (PGlite verwerkt één query tegelijk). De garantie rust op `SELECT … FOR UPDATE` in `accept_proposal` plus de unieke index, die wel apart is getest.

## End-to-end (`node tools/local-supabase/e2e.mjs`): 84 geslaagd, 0 mislukt

Afzonderlijke browsercontexten voor opdrachtgever (mobiel), twee professionals, een 17-jarige, een ouder, beheer en een toegankelijkheidscontrole. Doorlopen: rondkijken zonder JavaScript; opdracht beginnen zonder account → aanmelden → e-mailbevestiging → onboarding → concept terug → voorbeeld → publiceren; profielen, categorieën, portfolio; vraag met telefoonnummer geweigerd, zonder geplaatst en beantwoord; twee voorstellen; vergelijken en accepteren; chat in twee richtingen; nummer delen en tel:-belknop; afgewezen professional krijgt 404 op gesprek en een melding; starten → opleveren → afronden; beoordelen dubbelblind; derde account leest via de API geen berichten/nummers/andermans voorstellen en kan niets wijzigen of uploaden; vervalste Stripe-webhook 400, geldige 200, dubbel idempotent, Pro alleen via webhook; minderjarige: toestemmingsroute, leeftijd niet tonen, Pro en checkout server-side geblokkeerd; beheer: gewone gebruiker geweigerd, melding afgehandeld met motivering, in auditlog, melder ziet besluit; labels/alt/één h1/lang/skiplink op 7 pagina's, eerste Tab naar skiplink, zichtbare focus, reduced motion.

Gevonden en opgelost tijdens het testen: chat crashte na versturen in nieuwere Chrome (`scrollIntoView` geeft een Promise terug), accountpagina liep op mobiel horizontaal over, filters namen op mobiel het hele scherm in.

## Prestaties

Zie seo/audit.md: Lighthouse mobiel 97–98 performance, 100 toegankelijkheid, 100 best practices (lab, localhost).

## Niet getest

Supabase Realtime (lokaal niet nagebootst; terugval op ophalen getest), echte Auth-mails, Stripe Checkout/klantportaal tegen Stripe, Resend, Vercel Cron, Safari/Firefox, screenreaders (alleen structurele controles), echte gelijktijdigheid.
