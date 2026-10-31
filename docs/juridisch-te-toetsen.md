# Punten voor juridische beoordeling

Dit is geen juridisch advies. De teksten op `/voorwaarden`, `/privacy`, `/cookies` en `/communityregels` zijn **concepten** en staan zo gemarkeerd op de site.

## Minderjarigen (16 en 17)

- **Wet**: minderjarigen hebben voor rechtshandelingen toestemming van hun wettelijk vertegenwoordiger nodig; zonder toestemming zijn ze vernietigbaar. Vanaf 16 kan handlichting bij de kantonrechter. Voor KVK-inschrijving is ouderlijke toestemming nodig. (Ondernemersplein, Rechtspraak.)
- **Gebouwd**: 16/17-jarigen kunnen rondkijken en een profiel maken; opdrachten plaatsen, voorstellen sturen en accepteren pas na bevestiging via een eenmalige link naar het e-mailadres van een ouder/voogd (naam vastgelegd in het auditlog). 18+-categorieën blijven dicht. Pro (betaald) is server-side geblokkeerd. Leeftijd nooit openbaar.
- **Te toetsen**: is een e-mailbevestiging zonder identiteitscontrole van de ouder voldoende bewijs? Zijn er soorten werk die ongeschikt zijn ondanks toestemming (bijv. werk met risico's)? Gelden de Arbeidstijdenwet/arbobesluit-regels voor jongeren als een minderjarige feitelijk als werknemer wordt ingezet? Hoe lang bewaren we het toestemmingsbewijs?
- **Betaalprovider**: Stripe en Mollie stellen eigen leeftijds- en KYC-eisen aan accounthouders; voor platformbetalingen (later) zijn minderjarigen waarschijnlijk uitgesloten.

## Platformregels

- **DSA (Verordening (EU) 2022/2065)**: als hostingdienst geldt een meld-en-actiemechanisme (art. 16) en motivering van besluiten (art. 17) ongeacht omvang; gebouwd (melden, motivering, melding aan betrokkene, bezwaar). Micro- en kleine ondernemingen zijn uitgezonderd van een deel van de platformplichten (art. 19 en 29), maar we hebben interne bezwaarbehandeling toch ingebouwd. Te toetsen: contactpunt (art. 11/12), transparantierapportage, wanneer de uitzondering vervalt.
- **P2B-verordening en Omnibus/ACM**: rangschikkingsparameters uitleggen (gebouwd: `/hoe-het-werkt#rangschikking`, voorwaarden art. 4), aangeven of de aanbieder handelaar of particulier is (gebouwd: verplicht veld, zichtbaar op profiel en voorstel), en uitleggen hoe reviews worden geverifieerd (gebouwd). Betaalde plaatsingen bestaan niet.
- **DAC7**: platformexploitanten moeten verkopers van "persoonlijke diensten" rapporteren aan de Belastingdienst als er vergoedingen via of bij het platform bekend zijn. Jobmarkt verwerkt geen opdrachtgeld en kent het uiteindelijke bedrag niet zeker (alleen het bedrag in een voorstel). Te toetsen: valt Jobmarkt in deze vorm onder de definitie van "platformexploitant" met rapportageplicht, en wat verandert als we later betalingen via het platform laten lopen?
- **Consumentenrecht voor Pro**: 14 dagen bedenktijd voor consumenten bij een abonnement op afstand; bij directe start naar rato betalen (vraagt een uitdrukkelijk verzoek in de checkout). Te toetsen: tekst en vinkje in Stripe Checkout; of zakelijke Pro-gebruikers anders behandeld worden.
- **Aansprakelijkheid**: de beperking in de voorwaarden is een placeholder.

## Privacy (AVG)

- Verwerkingsverantwoordelijke en contactgegevens invullen.
- Verwerkersovereenkomsten met Supabase, Vercel, Stripe, e-mailprovider; doorgifte buiten de EER beoordelen (Vercel/Stripe zijn Amerikaanse bedrijven).
- Grondslag voor opslag van geboortedatum en ouder-e-mail; bewaartermijnen (geïmplementeerd in `apply_retention()`); een DPIA overwegen gezien minderjarigen en berichten.
- Moderatortoegang tot gesprekken alleen bij open melding (gebouwd); vastleggen in de privacyverklaring (gedaan).

## Verboden en gereguleerde categorieën

Lijst en onderbouwing staan op `/communityregels`. Te toetsen: volledigheid (bijv. schoonheidsbehandelingen met injecties, elektra-werk aan meterkasten, dierenarts-handelingen) en of de waarschuwingsteksten bij categorieën juist zijn.
