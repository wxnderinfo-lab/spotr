-- Jobmarkt: kennisbank-startinhoud, audit op artikelen en wachtlijst voor beheer.
--
-- Vier artikelen, geschreven op basis van openbare bronnen die per artikel
-- in "sources" staan (geraadpleegd 2026-10-31). Geen verzonnen cijfers:
-- bedragen staan er alleen in als een officiële bron ze noemt.

CREATE OR REPLACE FUNCTION public.articles_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.body IS DISTINCT FROM OLD.body) THEN
    INSERT INTO public.audit_log (actor_id, action, target_type, target_id, details)
    VALUES (auth.uid(), CASE WHEN TG_OP = 'INSERT' THEN 'artikel_aangemaakt' ELSE 'artikel_gewijzigd' END, 'artikel', NEW.id::text,
      jsonb_build_object('slug', NEW.slug, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS articles_audit ON public.articles;
CREATE TRIGGER articles_audit AFTER INSERT OR UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.articles_audit();

GRANT SELECT ON public.waitlist TO authenticated;
DROP POLICY IF EXISTS "waitlist: admin leest" ON public.waitlist;
CREATE POLICY "waitlist: admin leest" ON public.waitlist FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

INSERT INTO public.articles (slug, title, excerpt, body, kind, author_id, category_id, status, seo_title, seo_description, sources, related_slugs, published_at, reviewed_at)
SELECT v.slug, v.title, v.excerpt, v.body, v.kind, a.id, c.id, 'gepubliceerd', v.seo_title, v.seo_description, v.sources::jsonb, v.related, TIMESTAMPTZ '2026-10-31 12:00+01', DATE '2026-10-31'
FROM (VALUES
(
'duidelijke-opdracht-schrijven',
'Een duidelijke opdracht schrijven: zo krijg je betere voorstellen',
'Hoe vollediger je opdracht, hoe beter professionals kunnen inschatten wat het kost en hoe lang het duurt. Een checklist die je in vijf minuten doorloopt.',
$md$Een professional kan alleen een goed voorstel doen als duidelijk is wat er moet gebeuren. Vage opdrachten leveren vage prijzen op, of veel vragen heen en weer. Met deze checklist voorkom je dat.

## 1. Begin met het resultaat

Schrijf niet alleen wat er moet gebeuren, maar ook wat je wilt hebben als het klaar is. "Woonkamer schilderen" zegt minder dan "Wanden en plafond van de woonkamer (ongeveer 35 m² muur) wit, kozijnen blijven zoals ze zijn". Bij online werk geldt hetzelfde: "Bruiloftsvideo monteren tot een film van 5 tot 8 minuten, met muziek die ik aanlever" is concreet.

## 2. Beschrijf de situatie nu

- Wat is er al aanwezig? Bijvoorbeeld verf, materiaal, een bestaande website of ruw beeldmateriaal.
- In welke staat is het? Scheuren, oude lagen behang, een verouderd systeem.
- Zijn er beperkingen? Een smalle trap, geen parkeerplek, huisdieren, een vaste deadline.

Een paar foto's helpen enorm. Op Jobmarkt halen we de locatiegegevens uit je foto's, maar let er zelf op dat er geen huisnummer, kenteken of personen op staan.

## 3. Geef een budget of kies bewust voor 'in overleg'

Een bandbreedte (bijvoorbeeld "€ 300 tot € 600") helpt professionals om te bepalen of het past. Weet je het echt niet, kies dan 'in overleg' en lees de [gids over budget bepalen](/kennisbank/budget-bepalen-voor-een-klus). Een te laag budget trekt vooral haastig werk aan.

## 4. Zeg wanneer het moet gebeuren

"Zo snel mogelijk", "vóór 1 december" of "flexibel" zijn alle drie prima, als je het maar zegt. Bij een vaste datum (een event of verhuizing) is dat essentieel.

## 5. Houd contactgegevens erbuiten

Je telefoonnummer, e-mailadres en adres horen niet in de opdrachttekst. Vragen van professionals komen openbaar onder je opdracht, zonder contactgegevens. Na je keuze open je een privégesprek en kun je zelf beslissen of je je nummer deelt.

## Checklist

- Titel: wat en waar, in één zin
- Het resultaat dat je verwacht
- De huidige situatie en wat er al is
- Foto's of voorbeelden
- Budget of 'in overleg'
- Planning of deadline
- Geen persoonlijke contactgegevens

Ben je klaar? [Plaats je opdracht](/opdracht-plaatsen). Je ziet hem eerst als voorbeeld, voordat hij online gaat.$md$,
'gids', NULL,
'Duidelijke opdracht schrijven: checklist voor betere voorstellen',
'Zo schrijf je een opdracht waar professionals een goed voorstel op kunnen doen: resultaat, situatie, budget, planning en foto''s.',
'[{"title":"ACM ConsuWijzer: Klus, opleiding of opdracht annuleren","url":"https://consument.acm.nl/aankoop-dienst-annuleren/klus-opleiding-opdracht-annuleren","accessed":"2026-10-31"}]',
ARRAY['professional-kiezen','budget-bepalen-voor-een-klus']
),
(
'professional-kiezen',
'Hoe kies je een goede professional?',
'Prijs is maar één ding. Waar je op let bij voorstellen, portfolio, beoordelingen en afspraken, en welke wettelijke eisen er voor sommige klussen gelden.',
$md$Je hebt een paar voorstellen binnen. Welke kies je? De laagste prijs is niet altijd de beste keuze, en de hoogste ook niet. Zo vergelijk je eerlijk.

## Lees wat er bij de prijs zit

Twee voorstellen van € 400 kunnen heel verschillend zijn. Kijk of materiaal, voorbereiding, reiskosten en opruimen inbegrepen zijn. Bij een uurtarief: hoeveel uur schat de professional? Vraag het gerust onder je opdracht; vragen en antwoorden zijn voor iedereen zichtbaar, dus andere professionals hebben er ook iets aan.

## Kijk naar eerder werk, niet alleen naar sterren

Op Jobmarkt komen beoordelingen alleen van opdrachtgevers die via Jobmarkt een opdracht met die professional hebben afgerond. Iemand zonder beoordelingen is dus vaak gewoon nieuw op het platform. Kijk dan naar het portfolio, de uitleg in het voorstel en of de planning realistisch klinkt.

Let bij beoordelingen op:

- Gaan ze over vergelijkbare opdrachten als die van jou?
- Wat zeggen ze over communicatie en afspraken nakomen, niet alleen over het eindresultaat?
- Hoe reageert de professional op kritiek?

## Bedrijf of particulier?

Op elk profiel staat of iemand als bedrijf (met KVK-inschrijving) of als particulier werkt. Dat is meer dan een formaliteit: je consumentenrechten gelden tegenover een bedrijf, niet tegenover een particulier. Een KVK-nummer kun je zelf opzoeken in het [Handelsregister van de KVK](https://www.kvk.nl/zoeken/). Staat er "KVK gecontroleerd" op een profiel, dan heeft Jobmarkt de inschrijving handmatig nagekeken. Dat zegt iets over de inschrijving, niet over de kwaliteit van het werk.

## Wettelijke eisen bij sommige klussen

Voor een paar soorten werk gelden extra eisen. Twee voorbeelden:

- **Werk aan cv-ketels en andere gastoestellen** mag sinds 1 april 2023 alleen door een bedrijf met een CO-certificaat worden gedaan. Vraag ernaar.
- **Asbest verwijderen** mag alleen door een gecertificeerd bedrijf en valt buiten Jobmarkt.

Bij de categorie staat het als er zo'n eis geldt.

## Maak afspraken zwart op wit

Spreek in het gesprek na je keuze af wat er gebeurt, wanneer, voor welke prijs en hoe en wanneer je betaalt. Jobmarkt houdt geen geld vast: jullie rekenen rechtstreeks met elkaar af. Betaal bij voorkeur pas na (een deel van) het werk en nooit vooraf aan iemand die je niet vertrouwt.

## Bedenktijd

Sluit je bij jou thuis een overeenkomst met een bedrijf, dan heb je als consument in veel gevallen 14 dagen bedenktijd. Er zijn uitzonderingen, bijvoorbeeld voor spoedreparaties die je zelf aanvraagt. Lees de details bij [ACM ConsuWijzer](https://consument.acm.nl/aankoop-dienst-annuleren/klus-opleiding-opdracht-annuleren).$md$,
'gids', NULL,
'Een goede professional kiezen: waar let je op?',
'Voorstellen vergelijken, portfolio en beoordelingen lezen, bedrijf of particulier, wettelijke eisen en goede afspraken maken.',
'[{"title":"KVK: Zoeken in het Handelsregister","url":"https://www.kvk.nl/zoeken/","accessed":"2026-10-31"},{"title":"Kiwa: Veelgestelde vragen CO-certificering","url":"https://www.kiwa.com/nl/nl/specials/certificering-preventie-koolmonoxide/veelgestelde-vragen-co-certificering/","accessed":"2026-10-31"},{"title":"ACM ConsuWijzer: Klus, opleiding of opdracht annuleren","url":"https://consument.acm.nl/aankoop-dienst-annuleren/klus-opleiding-opdracht-annuleren","accessed":"2026-10-31"},{"title":"ACM: Online marktplaatsen","url":"https://www.acm.nl/nl/digitale-economie/online-diensten-aanbieden/online-marktplaatsen","accessed":"2026-10-31"}]',
ARRAY['duidelijke-opdracht-schrijven','budget-bepalen-voor-een-klus']
),
(
'budget-bepalen-voor-een-klus',
'Budget bepalen voor een klus: uren, materiaal en btw',
'Een realistisch budget is de som van arbeid, materiaal en btw. Hoe je die inschat, en waarom schilderen in een bestaande woning onder het lage btw-tarief valt.',
$md$We noemen in deze gids bewust geen "gemiddelde prijs per klus": die verschilt te veel per regio, situatie en vakgebied, en we publiceren geen cijfers die we niet kunnen onderbouwen. Wel kun je zelf een goede inschatting maken.

## De drie onderdelen van een prijs

1. **Arbeid**: uren maal uurtarief, of een vaste prijs die de professional zelf heeft uitgerekend.
2. **Materiaal**: verf, tegels, onderdelen, software-licenties of huur van apparatuur.
3. **Btw**: rekent een bedrijf btw, dan zit die in de prijs voor consumenten. Een particulier rekent geen btw.

Daarnaast kunnen voorrijkosten, afvoer van afval en reiskosten meetellen. Vraag of ze in het voorstel zitten.

## Laag btw-tarief voor sommige klussen in huis

Voor een aantal werkzaamheden aan woningen geldt het verlaagde btw-tarief van 9% in plaats van 21%:

| Werk | Btw | Voorwaarde |
| --- | --- | --- |
| Schilderen, stukadoren, behangen | 9% | Woning ouder dan 2 jaar |
| Isoleren | 9% | Woning ouder dan 2 jaar |
| Schoonmaken van woningen | 9% | Geen leeftijdseis |
| Ander werk aan woningen | 21% | |

Dit volgt uit de informatie van de Belastingdienst. Is het werk onderdeel van een grotere verbouwing, dan moet de ondernemer het 9%-deel en het 21%-deel apart op de offerte en factuur zetten.

## Zo kom je tot een bandbreedte

- Vraag jezelf af hoeveel uur jij denkt dat het kost, en wees ruim.
- Zoek materiaalprijzen op bij een bouwmarkt of webwinkel.
- Plaats je opdracht met een bandbreedte, bijvoorbeeld "€ 300 tot € 600", of kies 'in overleg'.
- Vergelijk daarna de voorstellen: wat zit erin, en hoeveel uur rekent iedereen?

Een voorstel dat veel lager is dan de rest kan een signaal zijn dat iets ontbreekt. Vraag het na voordat je kiest.

## Online werk

Bij online opdrachten zoals video-editing, ontwerp of websites bepaalt de omvang de prijs: lengte van de video, aantal correctierondes, aantal pagina's. Leg die vast in je opdracht, dan zijn voorstellen beter te vergelijken.$md$,
'prijsgids', NULL,
'Budget voor een klus bepalen: uren, materiaal en btw (9% of 21%)',
'Zo schat je een realistisch budget in. Plus: wanneer schilderen, stukadoren, behangen en schoonmaken onder 9% btw vallen.',
'[{"title":"Belastingdienst: Werkzaamheden aan woningen (9% btw)","url":"https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/diensten_9_btw/werkzaamheden_aan_woningen","accessed":"2026-10-31"}]',
ARRAY['duidelijke-opdracht-schrijven','professional-kiezen']
),
(
'starten-als-zelfstandige',
'Starten als zelfstandige: wat regel je als eerste?',
'KVK-inschrijving, btw en de kleineondernemersregeling, en wat er anders is als je 16 of 17 bent. Een startpunt met links naar de officiële bronnen.',
$md$Wil je via Jobmarkt regelmatig opdrachten doen? Dan ben je al snel ondernemer. Deze gids zet de eerste stappen op een rij. Het is algemene informatie: twijfel je over jouw situatie, vraag het dan na bij de KVK of de Belastingdienst.

## Ben je ondernemer?

Of je ondernemer bent, hangt onder meer af van hoeveel je werkt, voor hoeveel opdrachtgevers en of je zelf risico loopt. De Belastingdienst beoordeelt dat. Eén keer een vriend helpen met verhuizen maakt je geen ondernemer; elke week opdrachten aannemen waarschijnlijk wel.

## Inschrijven bij de KVK

Een eenmanszaak schrijf je in bij de KVK. Daarvoor betaal je een eenmalige inschrijfvergoeding die jaarlijks met de inflatie meegaat; het actuele bedrag staat op de [pagina inschrijfvergoeding van de KVK](https://www.kvk.nl/inschrijven/inschrijfvergoeding/). Na inschrijving krijg je ook een btw-identificatienummer van de Belastingdienst.

## Btw en de kleineondernemersregeling (KOR)

Als ondernemer reken je in principe btw over je diensten. Met de kleineondernemersregeling hoef je dat niet als je omzet maximaal € 20.000 per kalenderjaar is. Je meldt je daarvoor aan bij de Belastingdienst, uiterlijk vier weken voordat je de regeling wilt gebruiken. Ga je in een jaar over de grens, dan moet je je direct afmelden en weer btw rekenen.

Gebruik je de KOR niet, let dan op het juiste tarief: sommige werkzaamheden aan woningen vallen onder 9% btw, zie de [gids over budget en btw](/kennisbank/budget-bepalen-voor-een-klus).

## Jonger dan 18?

Je mag op elke leeftijd een bedrijf starten, maar onder de 18 heb je voor inschrijving bij de KVK en voor overeenkomsten toestemming van je ouders of voogd nodig. Ben je 16 of 17, dan kun je bij de kantonrechter handlichting aanvragen, zodat je voor je bedrijf zelf beslissingen mag nemen. De activiteiten moeten passen bij je leeftijd. Ondernemersplein heeft hier een [overzicht van de regels voor minderjarige ondernemers](https://ondernemersplein.overheid.nl/wetten-en-regels/regels-voor-minderjarige-ondernemers/).

Op Jobmarkt vragen 16- en 17-jarigen daarom toestemming van een ouder of voogd voordat ze opdrachten aannemen, en zijn sommige categorieën 18+.

## Je profiel op Jobmarkt

- Zet je profiel op "zakelijk" als je ingeschreven staat bij de KVK, en laat je KVK-nummer controleren.
- Vermeld duidelijk of je prijzen inclusief btw zijn.
- Begin met een paar sterke portfolio-items; beoordelingen komen vanzelf na je eerste afgeronde opdrachten.$md$,
'starters', NULL,
'Starten als zelfstandige: KVK, btw en KOR op een rij',
'De eerste stappen als zelfstandige: inschrijven bij de KVK, btw, de kleineondernemersregeling (€ 20.000) en regels voor 16- en 17-jarigen.',
'[{"title":"KVK: Inschrijfvergoeding","url":"https://www.kvk.nl/inschrijven/inschrijfvergoeding/","accessed":"2026-10-31"},{"title":"Belastingdienst: Voorwaarden voor deelname aan de KOR","url":"https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/kor-voorwaarden","accessed":"2026-10-31"},{"title":"Ondernemersplein: Regels voor minderjarige ondernemers","url":"https://ondernemersplein.overheid.nl/wetten-en-regels/regels-voor-minderjarige-ondernemers/","accessed":"2026-10-31"},{"title":"Rechtspraak: Handlichting","url":"https://www.rechtspraak.nl/juridische-begrippen/handlichting","accessed":"2026-10-31"}]',
ARRAY['professional-kiezen','budget-bepalen-voor-een-klus']
)
) AS v(slug, title, excerpt, body, kind, category_slug, seo_title, seo_description, sources, related)
CROSS JOIN LATERAL (SELECT id FROM public.authors WHERE slug = 'redactie') a
LEFT JOIN public.categories c ON c.slug = v.category_slug
ON CONFLICT (slug) DO NOTHING;

-- Contactformulier: iedereen mag een bericht sturen, alleen admins lezen.
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email text NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' AND char_length(email) <= 200),
  topic text NOT NULL CHECK (topic IN ('vraag', 'account', 'privacy', 'melding', 'pers', 'anders')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 4000),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT INSERT (name, email, topic, message, user_id) ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE (handled_at) ON public.contact_messages TO authenticated;
DROP POLICY IF EXISTS "contact: versturen" ON public.contact_messages;
CREATE POLICY "contact: versturen" ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "contact: admin leest" ON public.contact_messages;
CREATE POLICY "contact: admin leest" ON public.contact_messages FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
DROP POLICY IF EXISTS "contact: admin afhandelen" ON public.contact_messages;
CREATE POLICY "contact: admin afhandelen" ON public.contact_messages FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- Bewaartermijnen (zie /privacy). Draait in de dagelijkse taak.
CREATE OR REPLACE FUNCTION public.apply_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r jsonb := '{}'::jsonb;
  n int;
BEGIN
  DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('rate_limit_events', n);
  DELETE FROM public.email_outbox WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('email_outbox', n);
  DELETE FROM public.notifications WHERE read_at IS NOT NULL AND created_at < now() - interval '1 year';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('notifications', n);
  DELETE FROM public.webhook_events WHERE received_at < now() - interval '1 year';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('webhook_events', n);
  DELETE FROM public.contact_messages WHERE created_at < now() - interval '2 years';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('contact_messages', n);
  DELETE FROM public.waitlist WHERE created_at < now() - interval '1 year';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('waitlist', n);
  DELETE FROM public.reports WHERE status IN ('afgehandeld', 'afgewezen') AND handled_at < now() - interval '2 years';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('reports', n);
  -- concepten die een half jaar niet zijn aangeraakt
  DELETE FROM public.jobs WHERE status = 'concept' AND updated_at < now() - interval '6 months';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('concept_jobs', n);
  RETURN r;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_retention() TO service_role;
