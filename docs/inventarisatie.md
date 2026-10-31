# Inventarisatie Spotr (31 oktober 2026)

## Wat er was

- **Repository**: `wxnderinfo-lab/spotr` (geen repo met de naam "Spotrr"; alleen het logobestand heette `spotrr.png`). Drie commits, geëxporteerd uit Bolt.
- **Stack**: Vite + React 18 + TypeScript + Tailwind 3, eigen mini-router (alleen client-side), `@supabase/supabase-js`, `lucide-react`. Geen server-rendering: Google zag een lege `<div id="root">`.
- **Schermen** (Engelstalig): landing, auth (login/register/forgot), onboarding, dashboard, jobs, job detail, post job, freelancers, profile, messages, pricing (met vooraf gekozen jaarkorting), admin, settings, terms, privacy.
- **Lokale wijzigingen**: op `main` stonden 9 niet-gecommitte bestanden (o.a. Google-login in `AuthContext`). Die zijn **niet aangeraakt**: Jobmarkt is gebouwd in een aparte worktree op branch `feat/jobmarkt`.
- **Supabase**: `.env.local` wees naar project `tgtfmfityhicjbevxiqj`; dat domein bestaat niet meer (Bolt-database). De CLI-account heeft een organisatie **"jobmarkt" zonder project**.
- **Logo**: wit beeldmerk van twee ronde boogstreken (een "S") met een losse punt, plus woordmerk "Spotr". Bewaard in `docs/brand/legacy/`.

## Problemen in Spotr

- Verzonnen cijfers en reviews: "42,000+ verified professionals", "312 joined this month", vier verzonnen testimonials met 5 sterren, verzonnen voorbeeldprofielen met ratings. Alles verwijderd.
- Beveiliging in het oude schema: gebruikers konden zelf een abonnement invoegen/wijzigen, meldingen voor anderen aanmaken, en iedere ingelogde gebruiker kon reviews plaatsen zonder opdracht.
- Google Analytics met placeholder-ID zonder toestemmingsbanner; prijzen met vooraf geselecteerde jaarbetaling.

## Wat behouden is

- De **identiteit**: zwart-wit basis, afgeronde kaarten en knoppen, veel witruimte, onderbalk op mobiel (Spotr `BottomNav`), lichte en donkere modus.
- Het **beeldmerk** is doorontwikkeld: dezelfde dikke, ronde boogstreek vormt nu een "j" en de losse punt is de i-punt in de accentkleur. Zie `src/components/Logo.tsx` en `src/app/icon.svg`.
- Functionele ideeën: rollen, berichten, notificaties, portfolio, verificatie, beheer. Allemaal opnieuw gebouwd met echte autorisatie.
- De oude migraties staan gearchiveerd in `supabase/legacy-spotr/` (niet uitgevoerd).

## Wat niet kon zonder jou

- **Repository hernoemen**: account `raketkroket` heeft push- maar geen adminrechten op `wxnderinfo-lab/spotr`. De naam `wxnderinfo-lab/jobmarkt` is vrij. Zie LIVEGANG.md.
- **Supabase-project**: de organisatie "jobmarkt" heeft nog geen project. Gebouwd en getest tegen een lokale nabootsing met dezelfde migraties.
