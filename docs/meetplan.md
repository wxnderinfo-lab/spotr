# Meetplan

Uitgangspunt: meten met **eigen databasegegevens**, zonder trackingcookies. Alles hieronder is met SQL te tellen in de Supabase SQL-editor (service role). Geen cijfers publiceren die we niet zo kunnen onderbouwen.

## Kernstatistieken (wekelijks)

| Metriek | Definitie | Query (vereenvoudigd) |
| --- | --- | --- |
| Geplaatste opdrachten | Gepubliceerd in de week | `select count(*) from jobs where published_at >= now() - interval '7 days';` |
| Opdrachten met ≥ 1 voorstel binnen 72 uur | Liquiditeit voor opdrachtgevers | `select count(*) filter (where exists (select 1 from proposals p where p.job_id = j.id and p.created_at < j.published_at + interval '72 hours'))::float / count(*) from jobs j where published_at >= now() - interval '28 days';` |
| Voorstellen | Verstuurd | `select count(*) from proposals where created_at >= now() - interval '7 days';` |
| Acceptatiegraad | Opdrachten toegewezen / gepubliceerd (28 dagen, vertraagd) | `select count(*) filter (where accepted_proposal_id is not null)::float / count(*) from jobs where published_at between now() - interval '56 days' and now() - interval '28 days';` |
| Afgerond | Status afgerond | `select count(*) from jobs where completed_at >= now() - interval '7 days';` |
| Beoordelingen | Per afgeronde opdracht | `select count(*)::float / nullif((select count(*) from jobs where status = 'afgerond'), 0) from reviews;` |
| Actieve professionals | ≥ 1 voorstel in 28 dagen | `select count(distinct provider_id) from proposals where created_at >= now() - interval '28 days';` |
| Limietdruk | Professionals die de gratis limiet raken | `select count(*) from (select provider_id from proposals where created_at >= date_trunc('month', now()) group by 1 having count(*) >= 5) x;` |
| Abonnementen | Actief/trialing, opzeggingen | `select status, count(*) from subscriptions group by 1;` |
| Moderatie | Open meldingen, doorlooptijd | `select avg(handled_at - created_at) from reports where handled_at is not null;` |

Per **categorie** en **regio** (provincie via `places`) uitsplitsen: daar beslis je waar je professionals werft en welke lokale pagina's zin hebben.

## Funnel (zonder tracking)

1. Concepten aangemaakt → gepubliceerd: `jobs` met `status='concept'` vs `published_at is not null`.
2. Gepubliceerd → ≥ 1 voorstel → toegewezen → afgerond → beoordeeld.
3. Professionals: account → categorieën gekozen → eerste voorstel → eerste acceptatie.

## Beslismomenten

- **Betalen openen** (`BILLING_ENABLED`): pas als in de kerncategorieën ≥ 60% van de opdrachten binnen 72 uur een voorstel krijgt en een deel van de professionals de gratis limiet raakt.
- **Limiet van 5 bijstellen**: als veel professionals op 5 zitten en opdrachtgevers toch te weinig voorstellen krijgen, is de limiet te krap.

## Later, als er bezoekersstatistieken nodig zijn

Een cookieloze, privacyvriendelijke oplossing, of GA4 met Consent Mode en een echte toestemmingskeuze. Pas het cookiebeleid eerst aan.
