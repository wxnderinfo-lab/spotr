# Product- en verdienmodeladvies

Datum: 31 oktober 2026. Bedragen zijn producthypotheses, geen bewezen optimale prijzen.

## Drie modellen vergeleken

| | A. Gratis + Pro-abonnement (gekozen) | B. Alleen vergoeding op via het platform betaalde opdrachten | C. Hybride: abonnement + lagere transactievergoeding |
| --- | --- | --- | --- |
| Opdrachtgever | Gratis | Gratis of servicekosten | Gratis of lage servicekosten |
| Professional | 5 voorstellen/maand gratis; Pro € 19,95/m | % van het opdrachtbedrag | Abonnement + kleiner % |
| Werkt bij weinig aanbod (start) | Ja: geen geldstroom nodig; met introductieperiode zelfs zonder betalen | Slecht: geen omzet zolang er geen betaalde opdrachten zijn | Matig |
| Betaalbereidheid | Vaste, voorspelbare kosten; geen "kosten per lead" | Alleen betalen bij succes is aantrekkelijk, maar % voelt duur bij grote klussen (bouw) | Ingewikkeld uit te leggen |
| Lekkage (afspraken buiten het platform) | Geen probleem: we verdienen niet op het opdrachtgeld | Groot probleem bij lokale klussen: na het eerste contact rekenen partijen vaak rechtstreeks af | Middel |
| Fraude/risico | Laag: alleen abonnementsgeld | Hoog: chargebacks, geschillen, oplichting | Middel–hoog |
| Betaalprovider | Stripe Billing (± 0,7% van abonnementsomzet bovenop transactiekosten) | Marketplace-betalingen (Stripe Connect of Mollie Connect) met onboarding/KYC van iedere professional; minderjarigen kunnen meestal geen uitbetaalaccount hebben | Allebei |
| Administratie en regels | Eenvoudig | Uitbetalingen, facturatie namens, DAC7-rapportage van vergoedingen, mogelijk betaaldienst-vraagstukken | Allebei |
| Past bij de belofte "geen verborgen kosten" | Ja | Minder | Minder |

## Advies

**Start met model A**, met een **gratis introductieperiode** voor Pro-rechten (instelling `intro_period_until` in beheer; bijvoorbeeld 3 tot 6 maanden). Verkoop Pro pas actief zodra er in de belangrijkste categorieën en regio's regelmatig opdrachten zijn; tot die tijd staat `BILLING_ENABLED` uit en zegt de site eerlijk dat betalen nog niet geopend is.

Waarom:

1. **Liquiditeit eerst.** Een marktplaats zonder opdrachten kan professionals niets verkopen. Met gratis Pro-rechten in de introductie en gratis plaatsen bouw je beide kanten op.
2. **Lekkage maakt model B zwak voor lokale klussen.** Wie een schilder via een platform vindt, rekent in de praktijk vaak rechtstreeks af. Een abonnement verdient niet op het opdrachtgeld en hoeft dat dus ook niet af te dwingen.
3. **Geen escrow-beloftes.** Omdat partijen rechtstreeks afrekenen, claimt Jobmarkt geen verzekerde betaling of kopersbescherming (staat zo op de site).
4. **Lage operationele last en risico** voor een startend team, en geen uitbetaalproblemen voor 16- en 17-jarigen.

**Later (model C) overwegen** voor online opdrachten (video, ontwerp, websites), waar betalen via het platform wél waarde heeft (oplevering, mijlpalen). Dan eerst: juridische toets, DAC7-rapportageplicht, keuze tussen Stripe Connect en Mollie Connect, en een eerlijke voorwaardenpagina.

## Wat er in het product staat

- Centrale prijsconfiguratie: `src/config/pricing.ts` (weergave) en `app_settings.plan_limits` / `anti_spam` (afgedwongen door de database).
- Gratis: 5 nieuwe voorstellen per kalendermaand (Europe/Amsterdam). Ingetrokken voorstellen tellen mee. Geaccepteerde opdrachten afronden en chatten kan altijd.
- Pro: geen maandlimiet, wel 15 voorstellen per dag en max. 25 per opdracht (voor iedereen); zoekmeldingen; profielstatistieken. **Geen** ranking-voordeel, geen badge, geen contactgegevens.
- Prijs toont altijd incl. btw (en excl. btw), maandelijks, automatisch verlengd, opzeggen in het Stripe-klantportaal, geen vooraf gekozen jaarbetaling.
- Pro alleen vanaf 18 (server-side geblokkeerd in de checkout-route).

## Wat we na de start moeten leren

- Hoeveel voorstellen een actieve professional per maand wil sturen (verdeling, niet gemiddelde). Is 5 te krap of juist ruim?
- Conversie van gratis naar Pro na de introductieperiode, per categorie.
- Of opdrachtgevers in online categorieën om betaalbescherming vragen (signaal voor model C).
Zie meetplan.md.
