-- Jobmarkt: categorieën en centrale instellingen.
--
-- Categorieën zijn referentiedata (geen gebruikers of opdrachten). Nieuwe
-- branches voeg je toe met een nieuwe migratie of in /beheer/categorieen.
-- Bewust NIET opgenomen (zie /communityregels): kinderopvang en oppas,
-- zorg en medische handelingen, personenvervoer, beveiliging, financieel en
-- juridisch advies, asbestsanering, rijles, erotiek, wapens, drugs, gokken.

INSERT INTO public.categories (slug, name, description, work_mode, min_age, sort_order) VALUES
  ('klussen-en-bouw', 'Klussen & bouw', 'Van een schilderklus tot een complete verbouwing.', 'op_locatie', 16, 10),
  ('tuin-en-buiten', 'Tuin & buiten', 'Onderhoud, bestrating, schuttingen en groen.', 'op_locatie', 16, 20),
  ('schoonmaak-en-huishouden', 'Schoonmaak & huishouden', 'Schoonmaak, glazenwassen en opruimen.', 'op_locatie', 16, 30),
  ('verhuizen-en-transport', 'Verhuizen & transport', 'Verhuizen, spullen ophalen en afvoeren.', 'op_locatie', 18, 40),
  ('foto-video-en-audio', 'Foto, video & audio', 'Fotografie, videografie, montage en geluid.', 'beide', 16, 50),
  ('ontwerp-en-content', 'Ontwerp & content', 'Logo''s, huisstijl, teksten en social media.', 'online', 16, 60),
  ('websites-en-software', 'Websites & software', 'Websites, webshops, apps en maatwerk.', 'online', 16, 70),
  ('digitale-hulp', 'Digitale hulp & administratie', 'Hulp met computer, netwerk en administratie.', 'beide', 16, 80),
  ('events-en-styling', 'Events & styling', 'Styling, catering, muziek en visagie.', 'op_locatie', 16, 90),
  ('les-en-begeleiding', 'Les & begeleiding', 'Bijles, muziekles en taalles.', 'beide', 16, 100),
  ('dieren', 'Dieren', 'Uitlaten en oppassen op huisdieren.', 'op_locatie', 16, 110),
  ('praktische-hulp', 'Praktische hulp', 'Kleine klusjes, boodschappen en een extra paar handen.', 'op_locatie', 16, 120)
ON CONFLICT (slug) DO NOTHING;

WITH sub(parent, slug, name, description, work_mode, min_age, note, questions, sort_order) AS (VALUES
  ('klussen-en-bouw', 'schilderwerk', 'Schilderen & behangen', 'Binnen- en buitenschilderwerk, behangen en sauswerk.', 'op_locatie', 16, NULL,
    '[{"key":"waar","label":"Binnen of buiten?","type":"select","options":["Binnen","Buiten","Allebei"]},{"key":"oppervlakte","label":"Ongeveer hoeveel m² of hoeveel ruimtes?","type":"text"}]', 10),
  ('klussen-en-bouw', 'timmerwerk', 'Timmerwerk', 'Kasten, deuren, kozijnen en maatwerk in hout.', 'op_locatie', 16, NULL, '[]', 20),
  ('klussen-en-bouw', 'montage', 'Montage & meubels', 'Meubels in elkaar zetten, ophangen en monteren.', 'op_locatie', 16, NULL,
    '[{"key":"wat","label":"Wat moet er gemonteerd worden?","type":"text"}]', 30),
  ('klussen-en-bouw', 'tegelwerk', 'Tegelwerk', 'Wand- en vloertegels in badkamer, keuken en toilet.', 'op_locatie', 16, NULL, '[]', 40),
  ('klussen-en-bouw', 'stucwerk', 'Stucwerk', 'Wanden en plafonds glad of in structuur afwerken.', 'op_locatie', 16, NULL, '[]', 50),
  ('klussen-en-bouw', 'vloeren', 'Vloeren leggen', 'Laminaat, pvc, parket en ondervloeren.', 'op_locatie', 16, NULL,
    '[{"key":"oppervlakte","label":"Hoeveel m² ongeveer?","type":"text"},{"key":"soort","label":"Welke vloer?","type":"select","options":["Laminaat","PVC","Parket","Anders"]}]', 60),
  ('klussen-en-bouw', 'loodgieterswerk', 'Loodgieterswerk', 'Kranen, afvoer, toilet en waterleidingen.', 'op_locatie', 18,
    'Werk aan gasverbrandingstoestellen zoals cv-ketels mag sinds 1 april 2023 alleen door een CO-gecertificeerd bedrijf worden gedaan. Vraag ernaar.', '[]', 70),
  ('klussen-en-bouw', 'elektra', 'Elektra', 'Stopcontacten, verlichting en groepen.', 'op_locatie', 18,
    'Werk aan de elektrische installatie hoort te voldoen aan NEN 1010. Kies iemand die aantoonbaar vakbekwaam is.', '[]', 80),
  ('klussen-en-bouw', 'dakwerk', 'Dakwerk & goten', 'Dakgoten, dakbedekking en reparaties op hoogte.', 'op_locatie', 18,
    'Werken op hoogte vraagt goede valbeveiliging. Bespreek vooraf hoe dat geregeld is.', '[]', 90),
  ('tuin-en-buiten', 'tuinonderhoud', 'Tuinonderhoud', 'Snoeien, maaien, wieden en seizoensonderhoud.', 'op_locatie', 16, NULL,
    '[{"key":"oppervlakte","label":"Hoe groot is de tuin ongeveer?","type":"select","options":["Kleiner dan 50 m²","50 tot 150 m²","Groter dan 150 m²"]},{"key":"frequentie","label":"Hoe vaak?","type":"select","options":["Eenmalig","Regelmatig"]}]', 10),
  ('tuin-en-buiten', 'bestrating', 'Bestrating', 'Tegels en klinkers leggen of herstraten.', 'op_locatie', 16, NULL, '[]', 20),
  ('tuin-en-buiten', 'schuttingen', 'Schuttingen & hekwerk', 'Schuttingen plaatsen of repareren.', 'op_locatie', 16, NULL, '[]', 30),
  ('tuin-en-buiten', 'bomen', 'Bomen snoeien & kappen', 'Snoeien en kappen van bomen en grote struiken.', 'op_locatie', 18,
    'Voor het kappen van bomen is in veel gemeenten een omgevingsvergunning nodig. Check dit bij je gemeente.', '[]', 40),
  ('schoonmaak-en-huishouden', 'schoonmaak', 'Schoonmaak', 'Huis, kantoor of opleveringsschoonmaak.', 'op_locatie', 16, NULL,
    '[{"key":"frequentie","label":"Hoe vaak?","type":"select","options":["Eenmalig","Wekelijks","Om de week","Anders"]},{"key":"ruimte","label":"Wat moet er schoongemaakt worden?","type":"text"}]', 10),
  ('schoonmaak-en-huishouden', 'glazenwassen', 'Glazenwassen', 'Ramen binnen en buiten.', 'op_locatie', 18, NULL, '[]', 20),
  ('schoonmaak-en-huishouden', 'opruimen', 'Opruimen & organiseren', 'Opruimen, sorteren en ruimte maken.', 'op_locatie', 16, NULL, '[]', 30),
  ('verhuizen-en-transport', 'verhuizen', 'Verhuizen', 'Verhuishulp met of zonder bus.', 'op_locatie', 18, NULL,
    '[{"key":"van_naar","label":"Van welke plaats naar welke plaats?","type":"text"},{"key":"verdieping","label":"Verdieping en lift?","type":"text"}]', 10),
  ('verhuizen-en-transport', 'transport', 'Spullen vervoeren', 'Meubels of grote spullen ophalen en bezorgen. Geen personenvervoer.', 'op_locatie', 18,
    'Personenvervoer (taxi) is niet toegestaan op Jobmarkt; daarvoor is een vergunning nodig.', '[]', 20),
  ('verhuizen-en-transport', 'afvoeren', 'Afvoeren & ontruimen', 'Grofvuil afvoeren en woningen ontruimen.', 'op_locatie', 18,
    'Asbest mag alleen door een gecertificeerd bedrijf worden verwijderd en valt buiten Jobmarkt.', '[]', 30),
  ('foto-video-en-audio', 'fotografie', 'Fotografie', 'Portret, bruiloft, product en vastgoed.', 'beide', 16, NULL,
    '[{"key":"soort","label":"Wat voor shoot?","type":"select","options":["Portret","Evenement of feest","Bruiloft","Product","Vastgoed","Anders"]},{"key":"duur","label":"Hoe lang ongeveer?","type":"text"}]', 10),
  ('foto-video-en-audio', 'videografie', 'Videografie', 'Opnames van evenementen, bedrijven en social video.', 'beide', 16, NULL, '[]', 20),
  ('foto-video-en-audio', 'video-editing', 'Video-editing', 'Montage, ondertiteling, kleurcorrectie en shorts.', 'online', 16, NULL,
    '[{"key":"lengte","label":"Hoe lang wordt de eindvideo?","type":"text"},{"key":"materiaal","label":"Hoeveel ruw materiaal is er?","type":"text"}]', 30),
  ('foto-video-en-audio', 'drone', 'Drone-opnames', 'Luchtfoto''s en -video.', 'op_locatie', 18,
    'Voor dronevluchten gelden EU-regels: registratie als exploitant en vaak een bewijs van vakbekwaamheid. Vraag ernaar.', '[]', 40),
  ('foto-video-en-audio', 'audio', 'Audio & muziekproductie', 'Mixen, masteren, voice-overs en podcasts.', 'online', 16, NULL, '[]', 50),
  ('ontwerp-en-content', 'grafisch-ontwerp', 'Grafisch ontwerp & logo', 'Logo, huisstijl, drukwerk en presentaties.', 'online', 16, NULL, '[]', 10),
  ('ontwerp-en-content', 'social-media', 'Social media & content', 'Contentplanning, posts en beheer.', 'online', 16, NULL, '[]', 20),
  ('ontwerp-en-content', 'teksten', 'Teksten & vertalen', 'Webteksten, blogs, correctie en vertaling.', 'online', 16,
    'Schoolwerk, scripties of tentamens voor een ander maken is niet toegestaan.', '[]', 30),
  ('ontwerp-en-content', 'illustratie', 'Illustratie & animatie', 'Illustraties, iconen en motion graphics.', 'online', 16, NULL, '[]', 40),
  ('websites-en-software', 'websites', 'Websites', 'Nieuwe website, aanpassingen of onderhoud.', 'online', 16, NULL,
    '[{"key":"bestaand","label":"Is er al een website?","type":"select","options":["Nee, nieuw","Ja, aanpassen","Ja, opnieuw bouwen"]},{"key":"paginas","label":"Hoeveel pagina''s ongeveer?","type":"text"}]', 10),
  ('websites-en-software', 'webshops', 'Webshops', 'Webshop opzetten, koppelen of verbeteren.', 'online', 16, NULL, '[]', 20),
  ('websites-en-software', 'apps', 'Apps', 'Mobiele apps en prototypes.', 'online', 16, NULL, '[]', 30),
  ('websites-en-software', 'software', 'Maatwerk software & automatisering', 'Scripts, koppelingen en interne tools.', 'online', 16, NULL, '[]', 40),
  ('digitale-hulp', 'computerhulp', 'Computer- en telefoonhulp', 'Instellen, overzetten en problemen oplossen.', 'beide', 16, NULL, '[]', 10),
  ('digitale-hulp', 'netwerk', 'Wifi & netwerk', 'Wifi-bereik, mesh, printers en slimme apparaten.', 'op_locatie', 16, NULL, '[]', 20),
  ('digitale-hulp', 'administratie', 'Administratie & virtuele assistentie', 'Ordenen, invoeren en ondersteunen. Geen financieel advies.', 'online', 18,
    'Financieel advies valt onder de Wet op het financieel toezicht en hoort niet op Jobmarkt.', '[]', 30),
  ('events-en-styling', 'eventstyling', 'Eventstyling & decoratie', 'Aankleding van feesten, bruiloften en zakelijke events.', 'op_locatie', 16, NULL,
    '[{"key":"gasten","label":"Hoeveel gasten ongeveer?","type":"text"}]', 10),
  ('events-en-styling', 'catering', 'Catering & koken', 'Hapjes, diners en kookhulp.', 'op_locatie', 18,
    'Voor bereiden en serveren van eten gelden hygiëneregels uit de Warenwet. Alcohol schenken mag pas vanaf 18.', '[]', 20),
  ('events-en-styling', 'muziek-en-dj', 'DJ & muziek', 'DJ''s, bands en muzikanten voor je event.', 'op_locatie', 16, NULL, '[]', 30),
  ('events-en-styling', 'visagie', 'Visagie & haarstyling', 'Make-up en haar voor events en shoots.', 'op_locatie', 16, NULL, '[]', 40),
  ('events-en-styling', 'bediening', 'Bediening & bar', 'Extra handen in bediening en achter de bar.', 'op_locatie', 18,
    'Alcohol schenken mag pas vanaf 18 jaar.', '[]', 50),
  ('les-en-begeleiding', 'bijles', 'Bijles & huiswerkbegeleiding', 'Uitleg en oefenen, geen huiswerk voor een ander maken.', 'beide', 16, NULL,
    '[{"key":"vak","label":"Welk vak en niveau?","type":"text"}]', 10),
  ('les-en-begeleiding', 'muziekles', 'Muziekles', 'Les op een instrument of zangles.', 'beide', 16, NULL, '[]', 20),
  ('les-en-begeleiding', 'taalles', 'Taalles', 'Nederlands, Engels en andere talen.', 'beide', 16, NULL, '[]', 30),
  ('dieren', 'uitlaatservice', 'Hond uitlaten', 'Losse of vaste uitlaatrondes.', 'op_locatie', 16, NULL, '[]', 10),
  ('dieren', 'dierenoppas', 'Dierenoppas', 'Eten geven en verzorgen tijdens je afwezigheid.', 'op_locatie', 16, NULL, '[]', 20),
  ('praktische-hulp', 'klusjes', 'Kleine klusjes', 'Iets ophangen, lampje vervangen, even helpen.', 'op_locatie', 16, NULL, '[]', 10),
  ('praktische-hulp', 'boodschappen', 'Boodschappen & bezorgen', 'Boodschappen doen of iets wegbrengen.', 'op_locatie', 16, NULL, '[]', 20)
)
INSERT INTO public.categories (parent_id, slug, name, description, work_mode, min_age, regulation_note, questions, sort_order)
SELECT p.id, s.slug, s.name, s.description, s.work_mode, s.min_age, s.note, s.questions::jsonb, s.sort_order
FROM sub s JOIN public.categories p ON p.slug = s.parent
ON CONFLICT (slug) DO NOTHING;

-- Centrale limieten. De app leest dezelfde waarden (src/config/pricing.ts
-- beschrijft de prijzen; de database dwingt de limieten af).
INSERT INTO public.app_settings (key, value, description) VALUES
  ('plan_limits', '{"gratis":{"proposals_per_month":5,"saved_search_alerts":false},"pro":{"proposals_per_month":null,"saved_search_alerts":true}}',
    'Voorstellen per kalendermaand (Europe/Amsterdam). null = geen maandlimiet.'),
  ('anti_spam', '{"proposals_per_day":15,"max_proposals_per_job":25,"jobs_per_day":5,"questions_per_day":10,"messages_per_minute":20,"reports_per_day":10}',
    'Grenzen voor iedereen, ook Pro.'),
  ('intro_period_until', 'null', 'Tot en met deze datum (JJJJ-MM-DD) krijgt iedereen Pro-rechten zonder te betalen. null = uit.'),
  ('review_blind_days', '14', 'Dagen na afronden waarin beoordelingen verborgen blijven tot beide partijen hebben beoordeeld.'),
  ('review_deadline_days', '30', 'Dagen na afronden waarin je nog kunt beoordelen.'),
  ('job_expiry_days', '30', 'Na zoveel dagen sluit een open opdracht automatisch.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.authors (slug, name, role, bio) VALUES
  ('redactie', 'Redactie Jobmarkt', 'Redactie',
   'De redactie schrijft praktische gidsen op basis van openbare bronnen, die bij ieder artikel staan. We vermelden wanneer een artikel voor het laatst is gecontroleerd.')
ON CONFLICT (slug) DO NOTHING;
