# Google zonder Business-profiel

Er is geen Google Business-profiel en we maken er geen aan.

## Waarom niet

- Een website heeft **geen** Business-profiel nodig om in de gewone (organische) zoekresultaten te verschijnen.
- Volgens Google's richtlijnen komt een bedrijf in aanmerking als het een fysieke locatie heeft die klanten kunnen bezoeken, of naar klanten toe reist. Een online marktplaats doet geen van beide; een virtueel kantoor of postadres is uitdrukkelijk niet toegestaan. Er bestaat geen "approval bypass" of speciale aanvraag voor platforms.
- Professionals die zelf bij klanten werken, kunnen voor **hun eigen** bedrijf een profiel aanvragen; dat staat los van Jobmarkt.

## Wat wel kan (en wat nodig is)

| Stap | Wat | Wie | Status |
| --- | --- | --- | --- |
| Search Console | Domeinproperty, verificatie met een TXT-record bij de DNS-beheerder van het definitieve domein | Eigenaar (DNS-toegang) | Klaar om te doen na domeinkeuze |
| Sitemap indienen | `https://<domein>/sitemap.xml` | Eigenaar of met toegang | Sitemap gebouwd en getest |
| URL-inspectie | Kernpagina's handmatig laten crawlen; geen massale verzoeken | Eigenaar | Na livegang |
| Bing Webmaster Tools | Importeren vanuit Search Console | Eigenaar | Na livegang |
| IndexNow | Bing/Yandex direct laten weten welke URL's nieuw zijn; Google ondersteunt IndexNow niet | Ontwikkeling | Optioneel, later |
| Analytics | Nu geen. Als er statistieken nodig zijn: een privacyvriendelijke, cookieloze oplossing of GA4 met Consent Mode en een echte keuze. Eerst cookiebeleid aanpassen | Besluit eigenaar | Bewust uit |

Ik heb niets in Search Console of Bing ingesteld of ingediend: daarvoor is het definitieve domein en DNS-toegang nodig.
