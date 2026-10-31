# Handleiding beheeromgeving (`/beheer`)

## Toegang

- Rollen staan in `user_roles` en kunnen **niet** door gebruikers zelf worden gezet. De eerste admin zet je in de Supabase SQL-editor (zie LIVEGANG.md). Daarna kan een admin moderators aanwijzen in **Gebruikers**.
- **Moderator**: meldingen, moderatiewachtrij en geschillen. **Admin**: daarnaast gebruikers schorsen, rollen, KVK-controles, kennisbank, instellingen en auditlog.
- De database controleert bij elke actie opnieuw de rol; de pagina's zijn alleen de bediening.

## Dagelijks

1. **Overzicht**: open meldingen, opdrachten te controleren, geschillen, KVK-aanvragen, e-mailwachtrij.
2. **Meldingen** (oudste eerst): beoordeel tegen de communityregels. Kies besluit en actie (geen / inhoud verbergen / gebruiker schorsen). **Schrijf altijd een motivering**: die gaat naar melder en betrokkene, die bezwaar kunnen maken. Bij een melding over een bericht kun je het gesprek inzien zolang de melding open staat.
3. **Moderatie**: opdrachten met links, contactgegevens of signaalwoorden staan hier tot je ze goedkeurt of afwijst (met reden).
4. **Geschillen**: lees de reden en (via een melding) het gesprek; sluit af als afgerond, terug naar bezig, of geannuleerd. Jobmarkt houdt geen geld vast, dus het besluit gaat alleen over de status.
5. **Bezwaren** komen binnen als melding van het type "bezwaar". Laat ze door iemand anders dan de eerste beoordelaar behandelen.

## Wekelijks

- **KVK-controles**: zoek het nummer op in het KVK Handelsregister; keur alleen goed als naam en activiteit kloppen.
- **Kennisbank**: artikelen bijwerken, controledatum zetten, bronnen als JSON-lijst invullen. Gebruik een echte auteur (Auteurs-tabel; voeg een naam en rol toe in de database of via een volgende versie van beheer).
- **Contactberichten**: staan in de tabel `contact_messages` (SQL-editor); markeer afgehandeld met `handled_at`.

## Instellingen

- `intro_period_until`: datum `"2027-03-31"` (met aanhalingstekens) = iedereen Pro-rechten tot en met die datum; `null` = uit.
- `plan_limits`, `anti_spam`: limieten die de database afdwingt. Pas `src/config/pricing.ts` mee aan voor de teksten.
- `review_blind_days`, `review_deadline_days`, `job_expiry_days`.

## Auditlog

Alle beheerbesluiten, rolwijzigingen, instellingen, ouderlijke toestemmingen en artikelwijzigingen. Alleen-lezen.

## Dagelijkse taak

`/api/cron/daily` (Vercel Cron, 05:15 UTC, met `CRON_SECRET`): sluit verlopen opdrachten, past bewaartermijnen toe, stuurt zoekmeldingen voor Pro en verstuurt de e-mailwachtrij (als Resend is ingesteld).
