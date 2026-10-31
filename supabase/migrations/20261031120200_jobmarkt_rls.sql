-- Jobmarkt: Row Level Security, kolomrechten, opslag en realtime.
--
-- Uitgangspunt: alles dicht, dan per tabel precies openen wat nodig is.
-- Schrijfacties met bedrijfsregels gaan via de functies uit de vorige
-- migratie; directe UPDATE-rechten zijn per kolom beperkt.

-- ── RLS aan op alle tabellen ───────────────────────────────────────────────

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- ── Basisrechten ───────────────────────────────────────────────────────────
-- Supabase geeft anon/authenticated standaard alle tabelrechten; die halen we
-- weg en geven alleen wat nodig is. RLS blijft daarbovenop gelden.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.places, public.categories, public.profiles, public.profile_categories,
  public.portfolio_items, public.services, public.jobs, public.job_attachments, public.job_questions,
  public.authors, public.articles, public.app_settings
  TO anon, authenticated;

GRANT SELECT (id, birthdate, guardian_email, guardian_consent_status, guardian_consent_at, marketing_opt_in,
  accepted_terms_version, accepted_terms_at, created_at, updated_at) ON public.profile_private TO authenticated;

GRANT SELECT ON public.user_roles, public.verifications, public.job_status_history,
  public.proposals, public.conversations, public.messages, public.conversation_reads, public.contact_shares,
  public.reviews, public.notifications, public.favorites, public.saved_searches, public.blocks,
  public.reports, public.audit_log, public.subscriptions, public.email_outbox
  TO authenticated;

-- Profiel: alleen inhoudelijke kolommen, nooit status/verificatie/id.
GRANT UPDATE (username, display_name, avatar_path, headline, bio, skills, languages, experience_years,
  place_id, works_on_location, works_online, travel_radius_km, hourly_rate_cents, provider_type,
  company_name, is_provider, availability, available_from, availability_note, show_age)
  ON public.profiles TO authenticated;

-- Privé: alleen voorkeuren. Geboortedatum en toestemming via functies.
GRANT UPDATE (marketing_opt_in) ON public.profile_private TO authenticated;

GRANT INSERT, DELETE ON public.profile_categories TO authenticated;
GRANT INSERT (profile_id, kind, reference) ON public.verifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT INSERT (provider_id, category_id, slug, title, description, price_type, price_cents, delivery_note, work_mode, status),
  UPDATE (category_id, title, description, price_type, price_cents, delivery_note, work_mode, status)
  ON public.services TO authenticated;

-- Opdracht: aanmaken als concept, inhoud wijzigen. Status alleen via functies.
GRANT INSERT (client_id, category_id, title, description, work_mode, place_id, budget_type,
  budget_min_cents, budget_max_cents, timing, due_date, answers)
  ON public.jobs TO authenticated;
GRANT UPDATE (category_id, title, description, work_mode, place_id, budget_type,
  budget_min_cents, budget_max_cents, timing, due_date, answers)
  ON public.jobs TO authenticated;

GRANT INSERT (job_id, owner_id, path, alt), DELETE ON public.job_attachments TO authenticated;
GRANT INSERT (conversation_id, sender_id, body, attachment_path, attachment_name) ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT INSERT, DELETE ON public.favorites TO authenticated;
GRANT INSERT (user_id, kind, name, params, notify), UPDATE (name, params, notify), DELETE ON public.saved_searches TO authenticated;
GRANT INSERT, DELETE ON public.blocks TO authenticated;
GRANT INSERT (target_type, target_id, reason, details) ON public.reports TO authenticated;
GRANT INSERT (email, role, category_id, place_id) ON public.waitlist TO anon, authenticated;

-- Beheer via RLS (is_admin) op kennisbank en categorieën.
GRANT INSERT, UPDATE, DELETE ON public.articles, public.authors TO authenticated;
GRANT INSERT, UPDATE ON public.categories TO authenticated;
GRANT USAGE ON SEQUENCE public.categories_id_seq TO authenticated;

-- Functies die gebruikers mogen aanroepen.
GRANT EXECUTE ON FUNCTION
  public.slugify(text), public.distance_km(double precision, double precision, double precision, double precision),
  public.search_jobs(text, text, text, int, int, text, int, text, int, int),
  public.search_professionals(text, text, text, int, int, int, boolean, numeric, text, int, int),
  public.get_reviews(uuid, int, int), public.profile_stats(uuid), public.public_age(uuid),
  public.confirm_guardian_consent(text, text), public.category_and_children(text),
  public.is_admin(), public.is_moderator()
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.complete_onboarding(date, text, text, boolean, text), public.my_account_status(),
  public.request_guardian_consent(text), public.revoke_guardian_consent(),
  public.publish_job(uuid), public.transition_job(uuid, text, text),
  public.ask_question(uuid, text), public.answer_question(uuid, text),
  public.submit_proposal(uuid, text, int, numeric, text, text, date, uuid[]),
  public.withdraw_proposal(uuid), public.decline_proposal(uuid), public.accept_proposal(uuid),
  public.mark_conversation_read(uuid), public.share_phone(uuid, text), public.revoke_phone(uuid),
  public.submit_review(uuid, int, int, int, int, text), public.respond_to_review(uuid, text),
  public.mod_handle_report(uuid, text, text, text), public.mod_review_job(uuid, boolean, text),
  public.mod_resolve_dispute(uuid, text, text), public.admin_set_role(uuid, text, boolean),
  public.admin_set_user_status(uuid, text, text), public.admin_set_setting(text, jsonb),
  public.admin_review_verification(uuid, boolean, text),
  public.export_my_data(), public.can_delete_account(), public.has_pro(uuid),
  public.is_conversation_participant(uuid, uuid), public.conversation_under_report(uuid),
  public.review_is_published(public.reviews), public.owned_count(text, uuid)
  TO authenticated;

-- De server-taak (service role) mag verlopen opdrachten sluiten.
GRANT EXECUTE ON FUNCTION public.expire_jobs() TO service_role;

-- ── Policies ───────────────────────────────────────────────────────────────

-- Referentie
DROP POLICY IF EXISTS "places: iedereen leest" ON public.places;
CREATE POLICY "places: iedereen leest" ON public.places FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories: actieve leest iedereen" ON public.categories;
CREATE POLICY "categories: actieve leest iedereen" ON public.categories FOR SELECT
  USING (is_active OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS "categories: admin beheert" ON public.categories;
CREATE POLICY "categories: admin beheert" ON public.categories FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
DROP POLICY IF EXISTS "categories: admin wijzigt" ON public.categories;
CREATE POLICY "categories: admin wijzigt" ON public.categories FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "app_settings: openbare instellingen" ON public.app_settings;
CREATE POLICY "app_settings: openbare instellingen" ON public.app_settings FOR SELECT
  USING (key IN ('plan_limits', 'anti_spam', 'intro_period_until', 'review_blind_days', 'review_deadline_days', 'job_expiry_days')
         OR (SELECT public.is_admin()));

-- Profielen
DROP POLICY IF EXISTS "profiles: actieve profielen openbaar" ON public.profiles;
CREATE POLICY "profiles: actieve profielen openbaar" ON public.profiles FOR SELECT
  USING (status = 'actief' OR id = (SELECT auth.uid()) OR (SELECT public.is_moderator()));
DROP POLICY IF EXISTS "profiles: eigen profiel wijzigen" ON public.profiles;
CREATE POLICY "profiles: eigen profiel wijzigen" ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profile_private: alleen jezelf" ON public.profile_private;
CREATE POLICY "profile_private: alleen jezelf" ON public.profile_private FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "profile_private: eigen voorkeuren" ON public.profile_private;
CREATE POLICY "profile_private: eigen voorkeuren" ON public.profile_private FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profile_categories: openbaar" ON public.profile_categories;
CREATE POLICY "profile_categories: openbaar" ON public.profile_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "profile_categories: eigen toevoegen" ON public.profile_categories;
CREATE POLICY "profile_categories: eigen toevoegen" ON public.profile_categories FOR INSERT TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "profile_categories: eigen verwijderen" ON public.profile_categories;
CREATE POLICY "profile_categories: eigen verwijderen" ON public.profile_categories FOR DELETE TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_roles: eigen rol of admin" ON public.user_roles;
CREATE POLICY "user_roles: eigen rol of admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
-- geen INSERT/UPDATE/DELETE-policy: rollen alleen via admin_set_role

DROP POLICY IF EXISTS "verifications: eigen of admin" ON public.verifications;
CREATE POLICY "verifications: eigen of admin" ON public.verifications FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS "verifications: eigen aanvraag" ON public.verifications;
CREATE POLICY "verifications: eigen aanvraag" ON public.verifications FOR INSERT TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()) AND kind = 'kvk' AND reference ~ '^[0-9]{8}$');

-- Portfolio en diensten
DROP POLICY IF EXISTS "portfolio: openbaar" ON public.portfolio_items;
CREATE POLICY "portfolio: openbaar" ON public.portfolio_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.status = 'actief')
         OR profile_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "portfolio: eigen toevoegen" ON public.portfolio_items;
CREATE POLICY "portfolio: eigen toevoegen" ON public.portfolio_items FOR INSERT TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid())
    AND public.owned_count('portfolio') < 24);
DROP POLICY IF EXISTS "portfolio: eigen wijzigen" ON public.portfolio_items;
CREATE POLICY "portfolio: eigen wijzigen" ON public.portfolio_items FOR UPDATE TO authenticated
  USING (profile_id = (SELECT auth.uid())) WITH CHECK (profile_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "portfolio: eigen verwijderen" ON public.portfolio_items;
CREATE POLICY "portfolio: eigen verwijderen" ON public.portfolio_items FOR DELETE TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "services: actieve openbaar" ON public.services;
CREATE POLICY "services: actieve openbaar" ON public.services FOR SELECT
  USING ((status = 'actief' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = provider_id AND p.status = 'actief'))
         OR provider_id = (SELECT auth.uid()) OR (SELECT public.is_moderator()));
DROP POLICY IF EXISTS "services: eigen toevoegen" ON public.services;
CREATE POLICY "services: eigen toevoegen" ON public.services FOR INSERT TO authenticated
  WITH CHECK (provider_id = (SELECT auth.uid()) AND status IN ('concept', 'actief')
    AND public.owned_count('services') < 20);
DROP POLICY IF EXISTS "services: eigen wijzigen" ON public.services;
CREATE POLICY "services: eigen wijzigen" ON public.services FOR UPDATE TO authenticated
  USING (provider_id = (SELECT auth.uid()) AND status <> 'verborgen')
  WITH CHECK (provider_id = (SELECT auth.uid()) AND status IN ('concept', 'actief', 'gepauzeerd', 'verwijderd'));

-- Opdrachten
DROP POLICY IF EXISTS "jobs: openbaar na publicatie" ON public.jobs;
CREATE POLICY "jobs: openbaar na publicatie" ON public.jobs FOR SELECT
  USING (
    (status IN ('open', 'toegewezen', 'bezig', 'opgeleverd', 'afgerond', 'verlopen') AND moderation_status = 'ok')
    OR client_id = (SELECT auth.uid())
    OR assigned_provider_id = (SELECT auth.uid())
    OR (SELECT public.is_moderator())
  );
DROP POLICY IF EXISTS "jobs: eigen concept aanmaken" ON public.jobs;
CREATE POLICY "jobs: eigen concept aanmaken" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (client_id = (SELECT auth.uid()) AND status = 'concept'
    AND public.owned_count('concept_jobs') < 10);
DROP POLICY IF EXISTS "jobs: eigen inhoud wijzigen zolang open" ON public.jobs;
CREATE POLICY "jobs: eigen inhoud wijzigen zolang open" ON public.jobs FOR UPDATE TO authenticated
  USING (client_id = (SELECT auth.uid()) AND status IN ('concept', 'open') AND proposal_count = 0)
  WITH CHECK (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "job_attachments: zichtbaar met opdracht" ON public.job_attachments;
CREATE POLICY "job_attachments: zichtbaar met opdracht" ON public.job_attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id));
DROP POLICY IF EXISTS "job_attachments: eigen toevoegen" ON public.job_attachments;
CREATE POLICY "job_attachments: eigen toevoegen" ON public.job_attachments FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid())
    AND split_part(path, '/', 1) = (SELECT auth.uid())::text
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = (SELECT auth.uid()) AND j.status IN ('concept', 'open'))
    AND public.owned_count('job_attachments', job_id) < 8);
DROP POLICY IF EXISTS "job_attachments: eigen verwijderen" ON public.job_attachments;
CREATE POLICY "job_attachments: eigen verwijderen" ON public.job_attachments FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "job_status_history: deelnemers" ON public.job_status_history;
CREATE POLICY "job_status_history: deelnemers" ON public.job_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id
    AND (j.client_id = (SELECT auth.uid()) OR j.assigned_provider_id = (SELECT auth.uid())))
    OR (SELECT public.is_moderator()));

DROP POLICY IF EXISTS "job_questions: zichtbaar" ON public.job_questions;
CREATE POLICY "job_questions: zichtbaar" ON public.job_questions FOR SELECT
  USING ((status = 'zichtbaar' AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id))
         OR asker_id = (SELECT auth.uid()) OR (SELECT public.is_moderator()));

-- Voorstellen: alleen de professional zelf en de opdrachtgever
DROP POLICY IF EXISTS "proposals: eigen of op eigen opdracht" ON public.proposals;
CREATE POLICY "proposals: eigen of op eigen opdracht" ON public.proposals FOR SELECT TO authenticated
  USING (provider_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = (SELECT auth.uid()))
    OR (SELECT public.is_moderator()));

-- Gesprekken: alleen deelnemers. Moderators alleen via een melding (zie hieronder).
DROP POLICY IF EXISTS "conversations: deelnemers" ON public.conversations;
CREATE POLICY "conversations: deelnemers" ON public.conversations FOR SELECT TO authenticated
  USING (client_id = (SELECT auth.uid()) OR provider_id = (SELECT auth.uid())
    OR public.conversation_under_report(id));

DROP POLICY IF EXISTS "messages: deelnemers lezen" ON public.messages;
CREATE POLICY "messages: deelnemers lezen" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id) OR public.conversation_under_report(conversation_id));
DROP POLICY IF EXISTS "messages: deelnemers schrijven" ON public.messages;
CREATE POLICY "messages: deelnemers schrijven" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()) AND kind = 'bericht' AND public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "conversation_reads: eigen" ON public.conversation_reads;
CREATE POLICY "conversation_reads: eigen" ON public.conversation_reads FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "contact_shares: deelnemers, niet ingetrokken" ON public.contact_shares;
CREATE POLICY "contact_shares: deelnemers, niet ingetrokken" ON public.contact_shares FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id) AND (revoked_at IS NULL OR user_id = (SELECT auth.uid())));

-- Beoordelingen: de schrijver ziet zijn eigen; openbaar alleen via get_reviews
DROP POLICY IF EXISTS "reviews: eigen geschreven" ON public.reviews;
CREATE POLICY "reviews: eigen geschreven" ON public.reviews FOR SELECT TO authenticated
  USING (reviewer_id = (SELECT auth.uid())
    OR (reviewee_id = (SELECT auth.uid()) AND public.review_is_published(reviews))
    OR (SELECT public.is_moderator()));

-- Meldingen
DROP POLICY IF EXISTS "notifications: eigen" ON public.notifications;
CREATE POLICY "notifications: eigen" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "notifications: eigen gelezen" ON public.notifications;
CREATE POLICY "notifications: eigen gelezen" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Favorieten en zoekopdrachten
DROP POLICY IF EXISTS "favorites: eigen" ON public.favorites;
CREATE POLICY "favorites: eigen" ON public.favorites FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "favorites: eigen toevoegen" ON public.favorites;
CREATE POLICY "favorites: eigen toevoegen" ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.owned_count('favorites') < 500);
DROP POLICY IF EXISTS "favorites: eigen verwijderen" ON public.favorites;
CREATE POLICY "favorites: eigen verwijderen" ON public.favorites FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "saved_searches: eigen" ON public.saved_searches;
CREATE POLICY "saved_searches: eigen" ON public.saved_searches FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
-- meldingen bij nieuwe opdrachten (notify) zijn een Pro-functie
DROP POLICY IF EXISTS "saved_searches: eigen toevoegen" ON public.saved_searches;
CREATE POLICY "saved_searches: eigen toevoegen" ON public.saved_searches FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND (NOT notify OR public.has_pro((SELECT auth.uid())))
    AND public.owned_count('saved_searches') < 20);
DROP POLICY IF EXISTS "saved_searches: eigen wijzigen" ON public.saved_searches;
CREATE POLICY "saved_searches: eigen wijzigen" ON public.saved_searches FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND (NOT notify OR public.has_pro((SELECT auth.uid()))));
DROP POLICY IF EXISTS "saved_searches: eigen verwijderen" ON public.saved_searches;
CREATE POLICY "saved_searches: eigen verwijderen" ON public.saved_searches FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Blokkeren
DROP POLICY IF EXISTS "blocks: eigen" ON public.blocks;
CREATE POLICY "blocks: eigen" ON public.blocks FOR SELECT TO authenticated USING (blocker_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "blocks: eigen toevoegen" ON public.blocks;
CREATE POLICY "blocks: eigen toevoegen" ON public.blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "blocks: eigen opheffen" ON public.blocks;
CREATE POLICY "blocks: eigen opheffen" ON public.blocks FOR DELETE TO authenticated USING (blocker_id = (SELECT auth.uid()));

-- Meldingen (reports): iedere ingelogde gebruiker kan melden; lezen alleen eigen + moderators
DROP POLICY IF EXISTS "reports: eigen of moderator" ON public.reports;
CREATE POLICY "reports: eigen of moderator" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()) OR (SELECT public.is_moderator()));
DROP POLICY IF EXISTS "reports: melden" ON public.reports;
CREATE POLICY "reports: melden" ON public.reports FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "audit_log: alleen admin" ON public.audit_log;
CREATE POLICY "audit_log: alleen admin" ON public.audit_log FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

-- Abonnementen: alleen lezen; schrijven doet de webhook met de service role
DROP POLICY IF EXISTS "subscriptions: eigen" ON public.subscriptions;
CREATE POLICY "subscriptions: eigen" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- Kennisbank
DROP POLICY IF EXISTS "authors: openbaar" ON public.authors;
CREATE POLICY "authors: openbaar" ON public.authors FOR SELECT USING (true);
DROP POLICY IF EXISTS "authors: admin" ON public.authors;
CREATE POLICY "authors: admin" ON public.authors FOR ALL TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "articles: gepubliceerd openbaar" ON public.articles;
CREATE POLICY "articles: gepubliceerd openbaar" ON public.articles FOR SELECT
  USING ((status = 'gepubliceerd' AND published_at <= now()) OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS "articles: admin" ON public.articles;
CREATE POLICY "articles: admin" ON public.articles FOR ALL TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- Wachtlijst: iedereen mag zich aanmelden, niemand leest via de API
DROP POLICY IF EXISTS "waitlist: aanmelden" ON public.waitlist;
CREATE POLICY "waitlist: aanmelden" ON public.waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "email_outbox: admin" ON public.email_outbox;
CREATE POLICY "email_outbox: admin" ON public.email_outbox FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

-- profile_private, rate_limit_events, billing_customers, webhook_events:
-- geen extra policies; alleen functies en de service role.

-- ── Opslag ─────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('portfolio', 'portfolio', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('job-media', 'job-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('chat-attachments', 'chat-attachments', false, 10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Openbare buckets: iedereen leest via de publieke URL; uploaden alleen in
-- je eigen map (<user-id>/...).
DROP POLICY IF EXISTS "jobmarkt: eigen map uploaden" ON storage.objects;
CREATE POLICY "jobmarkt: eigen map uploaden" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars', 'portfolio', 'job-media')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
DROP POLICY IF EXISTS "jobmarkt: eigen map lezen" ON storage.objects;
CREATE POLICY "jobmarkt: eigen map lezen" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('avatars', 'portfolio', 'job-media')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
DROP POLICY IF EXISTS "jobmarkt: eigen map verwijderen" ON storage.objects;
CREATE POLICY "jobmarkt: eigen map verwijderen" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('avatars', 'portfolio', 'job-media')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- Chatbijlagen: privé, map = gesprek-id, alleen deelnemers. Lezen via signed URL.
DROP POLICY IF EXISTS "jobmarkt: chatbijlage uploaden" ON storage.objects;
CREATE POLICY "jobmarkt: chatbijlage uploaden" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments'
    AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "jobmarkt: chatbijlage lezen" ON storage.objects;
CREATE POLICY "jobmarkt: chatbijlage lezen" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments'
    AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid));

-- ── Realtime ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;
