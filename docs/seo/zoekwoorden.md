# Zoekintentie- en keywordmap

Datum: 31 oktober 2026. **Er zijn geen zoekvolumes, moeilijkheidsscores of posities opgenomen**: daarvoor is geen betrouwbare databron gebruikt (Google Keyword Planner en Search Console zijn pas beschikbaar na een account en livegang). De volgorde binnen een groep is een inschatting van relevantie, niet van volume. Valideer met Search Console-data na 4–8 weken.

Uitgangspunt: Jobmarkt is een **opdrachten- en dienstenplatform**, geen vacaturesite. Zoektermen als "vacature schilder" (werk in loondienst) richten we niet op.

| Intentie | Voorbeelden van zoektermen (Nederlands) | Landingspagina | Status |
| --- | --- | --- | --- |
| Een professional zoeken (lokaal) | schilder zoeken, klusjesman inhuren, hovenier gezocht, verhuishulp | `/categorieen/<hoofd>/<sub>` (alleen indexeerbaar met aanbod), `/professionals` | Gebouwd |
| Een professional zoeken (online) | video editor inhuren, logo laten maken, website laten maken, freelance fotograaf | Online categoriepagina's, `/professionals?waar=online` (noindex), profielen | Gebouwd |
| Opdracht laten uitvoeren | klus plaatsen, offerte aanvragen schilder, iemand zoeken voor klus | `/opdracht-plaatsen`, `/hoe-het-werkt` | Gebouwd |
| Freelance opdrachten/klussen vinden | freelance opdrachten, klussen vinden, opdrachten zzp, bijverdienen met klussen | `/opdrachten`, categoriepagina's, `/aanmelden?rol=professional` | Gebouwd |
| Lokale diensten | schilder Almere, glazenwasser Utrecht | **Nog niet**: stad × categorie alleen bij echt aanbod (geen massapagina's) | Bewust later |
| Prijsinformatie | wat kost een schilder, btw schilderwerk 9%, uurtarief klusjesman | `/kennisbank/budget-bepalen-voor-een-klus`, toekomstige prijsgidsen per vak met bronnen | 1 artikel |
| Kiezen en vertrouwen | betrouwbare vakman vinden, kvk nummer checken, bedenktijd klus aan huis | `/kennisbank/professional-kiezen` | 1 artikel |
| Opdracht schrijven | offerte aanvraag schrijven, klus omschrijven | `/kennisbank/duidelijke-opdracht-schrijven` | 1 artikel |
| Starters | zzp starten, kvk inschrijven kosten, kleineondernemersregeling, ondernemen onder 18 | `/kennisbank/starten-als-zelfstandige` | 1 artikel |
| Merk | jobmarkt, jobmarkt inloggen | `/`, `/inloggen` (noindex,follow) | Gebouwd |

## Regels voor nieuwe landingspagina's

- Alleen een stad × categorie-pagina als er minstens een handvol actieve professionals én recente opdrachten zijn, en de pagina iets eigens toevoegt (aanbod, lokale regels, echte prijsinformatie). Geen sjabloontekst met alleen een andere plaatsnaam (Google: "scaled content abuse").
- Elke pagina heeft één duidelijke zoekintentie en linkt naar de volgende stap (plaatsen of aanmelden).
