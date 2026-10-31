-- Jobmarkt: kernschema.
--
-- Nieuwe basis voor het lege Supabase-project "jobmarkt". De oude Spotr-
-- migraties (supabase/legacy-spotr) horen bij een Bolt-database die niet meer
-- bestaat en worden niet toegepast. Deze migratie is additief: alleen CREATE
-- ... IF NOT EXISTS, geen DROP van tabellen of data.
--
-- Statussen zijn tekst met CHECK-constraints in plaats van enums, zodat een
-- nieuwe status later met een kleine, controleerbare migratie kan worden
-- toegevoegd.

-- ── Hulpfuncties ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(
    lower(translate(coalesce(input, ''),
      'áàâäãåéèêëíìîïóòôöõúùûüýÿçñÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÝÇÑ',
      'aaaaaaeeeeiiiiooooouuuuyycnaaaaaaeeeeiiiiooooouuuuycn')),
    '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ── Referentiedata ─────────────────────────────────────────────────────────

-- Woonplaatsen met het middelpunt uit de PDOK Locatieserver (BAG). Alleen
-- het middelpunt van de woonplaats wordt gebruikt voor afstand; er worden
-- nooit adressen opgeslagen.
CREATE TABLE IF NOT EXISTS public.places (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  municipality text NOT NULL,
  province text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  country_code text NOT NULL DEFAULT 'NL'
);
CREATE INDEX IF NOT EXISTS places_name_idx ON public.places (lower(name));
CREATE INDEX IF NOT EXISTS places_latlng_idx ON public.places (lat, lng);

CREATE TABLE IF NOT EXISTS public.categories (
  id serial PRIMARY KEY,
  parent_id int REFERENCES public.categories(id) ON DELETE RESTRICT,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  -- waar het werk meestal plaatsvindt
  work_mode text NOT NULL DEFAULT 'beide' CHECK (work_mode IN ('op_locatie', 'online', 'beide')),
  -- minimale leeftijd om in deze categorie werk aan te nemen
  min_age int NOT NULL DEFAULT 16 CHECK (min_age IN (16, 18)),
  -- tekst die bij plaatsen en reageren wordt getoond, bijv. een certificaatplicht
  regulation_note text,
  -- vragen die bij het plaatsen helpen: [{key,label,type,options?,required?}]
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON public.categories (parent_id);

-- Centrale instellingen die de database zelf afdwingt (limieten, introductie).
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- ── Profielen ──────────────────────────────────────────────────────────────

-- Openbare profieldata. Alles hierin mag iedereen zien zodra het profiel
-- actief is. Privégegevens staan in profile_private.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE CHECK (username ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 60),
  avatar_path text,
  headline text NOT NULL DEFAULT '' CHECK (char_length(headline) <= 120),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 3000),
  skills text[] NOT NULL DEFAULT '{}' CHECK (cardinality(skills) <= 20),
  languages text[] NOT NULL DEFAULT '{nl}' CHECK (cardinality(languages) <= 10),
  experience_years int CHECK (experience_years BETWEEN 0 AND 70),
  place_id int REFERENCES public.places(id),
  works_on_location boolean NOT NULL DEFAULT true,
  works_online boolean NOT NULL DEFAULT false,
  travel_radius_km int NOT NULL DEFAULT 25 CHECK (travel_radius_km BETWEEN 0 AND 300),
  hourly_rate_cents int CHECK (hourly_rate_cents BETWEEN 0 AND 100000),
  -- particulier of zakelijk aanbieder (ACM: consument moet dit kunnen zien)
  provider_type text NOT NULL DEFAULT 'particulier' CHECK (provider_type IN ('particulier', 'zakelijk')),
  company_name text CHECK (char_length(company_name) <= 120),
  -- of de gebruiker zich als professional laat vinden
  is_provider boolean NOT NULL DEFAULT false,
  availability text NOT NULL DEFAULT 'beschikbaar' CHECK (availability IN ('beschikbaar', 'beperkt', 'niet_beschikbaar')),
  available_from date,
  availability_note text NOT NULL DEFAULT '' CHECK (char_length(availability_note) <= 200),
  -- alleen voor volwassenen en alleen als de gebruiker dat zelf aanzet
  show_age boolean NOT NULL DEFAULT false,
  -- door beheer gezet, na een echte controle (zie verifications)
  kvk_verified_at timestamptz,
  status text NOT NULL DEFAULT 'actief' CHECK (status IN ('actief', 'geschorst', 'verwijderd')),
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_provider_idx ON public.profiles (is_provider, status);
CREATE INDEX IF NOT EXISTS profiles_place_idx ON public.profiles (place_id);
CREATE INDEX IF NOT EXISTS profiles_skills_idx ON public.profiles USING gin (skills);
CREATE INDEX IF NOT EXISTS profiles_search_idx ON public.profiles USING gin (search_vector);

DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Privégegevens: alleen de gebruiker zelf (en via functies de database).
CREATE TABLE IF NOT EXISTS public.profile_private (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  birthdate date CHECK (birthdate > DATE '1900-01-01'),
  -- ouderlijke toestemming voor 16- en 17-jarigen
  guardian_email text,
  guardian_consent_status text NOT NULL DEFAULT 'niet_nodig'
    CHECK (guardian_consent_status IN ('niet_nodig', 'aangevraagd', 'bevestigd', 'ingetrokken')),
  guardian_consent_at timestamptz,
  guardian_consent_token_hash text,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  accepted_terms_version text,
  accepted_terms_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS profile_private_touch ON public.profile_private;
CREATE TRIGGER profile_private_touch BEFORE UPDATE ON public.profile_private
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.profile_categories (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id int NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, category_id)
);
CREATE INDEX IF NOT EXISTS profile_categories_category_idx ON public.profile_categories (category_id);

-- Rollen worden nooit door gebruikers zelf gezet: geen INSERT/UPDATE-policy.
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator')),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

-- Verificaties die beheer handmatig heeft gecontroleerd (bijv. KVK).
CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('kvk')),
  reference text NOT NULL CHECK (char_length(reference) <= 40),
  status text NOT NULL DEFAULT 'ingediend' CHECK (status IN ('ingediend', 'goedgekeurd', 'afgewezen')),
  note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verifications_profile_idx ON public.verifications (profile_id);

-- ── Portfolio en diensten ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  image_path text,
  -- alleen YouTube en Vimeo: die tonen we als link, niet als ingesloten speler
  video_url text CHECK (video_url IS NULL OR video_url ~ '^https://(www\.)?(youtube\.com/watch\?v=[A-Za-z0-9_-]{6,}|youtu\.be/[A-Za-z0-9_-]{6,}|vimeo\.com/[0-9]{5,})'),
  category_id int REFERENCES public.categories(id),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (image_path IS NOT NULL OR video_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS portfolio_profile_idx ON public.portfolio_items (profile_id, sort_order);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id int NOT NULL REFERENCES public.categories(id),
  slug text NOT NULL UNIQUE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 8 AND 90),
  description text NOT NULL CHECK (char_length(description) BETWEEN 40 AND 5000),
  price_type text NOT NULL CHECK (price_type IN ('vast', 'uur', 'vanaf', 'op_aanvraag')),
  price_cents int CHECK (price_cents BETWEEN 100 AND 10000000),
  delivery_note text NOT NULL DEFAULT '' CHECK (char_length(delivery_note) <= 120),
  work_mode text NOT NULL DEFAULT 'op_locatie' CHECK (work_mode IN ('op_locatie', 'online', 'beide')),
  status text NOT NULL DEFAULT 'actief' CHECK (status IN ('concept', 'actief', 'gepauzeerd', 'verwijderd', 'verborgen')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (price_type = 'op_aanvraag' OR price_cents IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS services_provider_idx ON public.services (provider_id);
CREATE INDEX IF NOT EXISTS services_category_idx ON public.services (category_id, status);
DROP TRIGGER IF EXISTS services_touch ON public.services;
CREATE TRIGGER services_touch BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Opdrachten ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- korte, leesbare code voor de URL (/opdrachten/<slug>-<code>)
  code text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id int NOT NULL REFERENCES public.categories(id),
  title text NOT NULL CHECK (char_length(title) BETWEEN 8 AND 90),
  slug text NOT NULL DEFAULT '',
  description text NOT NULL CHECK (char_length(description) BETWEEN 30 AND 5000),
  work_mode text NOT NULL CHECK (work_mode IN ('op_locatie', 'online')),
  place_id int REFERENCES public.places(id),
  budget_type text NOT NULL CHECK (budget_type IN ('vast', 'uur', 'in_overleg')),
  budget_min_cents int CHECK (budget_min_cents BETWEEN 0 AND 10000000),
  budget_max_cents int CHECK (budget_max_cents BETWEEN 0 AND 10000000),
  timing text NOT NULL DEFAULT 'flexibel' CHECK (timing IN ('zo_snel_mogelijk', 'voor_datum', 'op_datum', 'flexibel')),
  due_date date,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'concept' CHECK (status IN (
    'concept', 'open', 'toegewezen', 'bezig', 'opgeleverd', 'afgerond', 'geannuleerd', 'geschil', 'verlopen', 'verwijderd')),
  moderation_status text NOT NULL DEFAULT 'ok' CHECK (moderation_status IN ('ok', 'in_beoordeling', 'afgewezen')),
  moderation_reason text,
  assigned_provider_id uuid REFERENCES public.profiles(id),
  accepted_proposal_id uuid,
  proposal_count int NOT NULL DEFAULT 0,
  published_at timestamptz,
  expires_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (work_mode = 'online' OR place_id IS NOT NULL OR status = 'concept'),
  CHECK (budget_max_cents IS NULL OR budget_min_cents IS NULL OR budget_max_cents >= budget_min_cents),
  CHECK (assigned_provider_id IS NULL OR assigned_provider_id <> client_id)
);
CREATE INDEX IF NOT EXISTS jobs_public_idx ON public.jobs (status, moderation_status, published_at DESC);
CREATE INDEX IF NOT EXISTS jobs_category_idx ON public.jobs (category_id, status);
CREATE INDEX IF NOT EXISTS jobs_client_idx ON public.jobs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_provider_idx ON public.jobs (assigned_provider_id);
CREATE INDEX IF NOT EXISTS jobs_place_idx ON public.jobs (place_id);
CREATE INDEX IF NOT EXISTS jobs_search_idx ON public.jobs USING gin (search_vector);

CREATE TABLE IF NOT EXISTS public.job_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  path text NOT NULL UNIQUE,
  alt text NOT NULL DEFAULT '' CHECK (char_length(alt) <= 160),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_attachments_job_idx ON public.job_attachments (job_id);

CREATE TABLE IF NOT EXISTS public.job_status_history (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_status_history_job_idx ON public.job_status_history (job_id, created_at);

-- Openbare vragen vóór acceptatie, zonder contactgegevens.
CREATE TABLE IF NOT EXISTS public.job_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  asker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 5 AND 600),
  answer text CHECK (char_length(answer) <= 1200),
  answered_at timestamptz,
  status text NOT NULL DEFAULT 'zichtbaar' CHECK (status IN ('zichtbaar', 'verborgen')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_questions_job_idx ON public.job_questions (job_id, created_at);

-- ── Voorstellen ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price_type text NOT NULL CHECK (price_type IN ('vast', 'uur')),
  amount_cents int NOT NULL CHECK (amount_cents BETWEEN 100 AND 10000000),
  estimated_hours numeric(6,1) CHECK (estimated_hours IS NULL OR estimated_hours BETWEEN 0.5 AND 2000),
  message text NOT NULL CHECK (char_length(message) BETWEEN 30 AND 3000),
  planning text NOT NULL DEFAULT '' CHECK (char_length(planning) <= 600),
  available_from date,
  portfolio_item_ids uuid[] NOT NULL DEFAULT '{}' CHECK (cardinality(portfolio_item_ids) <= 6),
  status text NOT NULL DEFAULT 'verstuurd' CHECK (status IN ('verstuurd', 'ingetrokken', 'geaccepteerd', 'afgewezen', 'gesloten')),
  counts_toward_quota boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, provider_id)
);
-- Harde garantie: per opdracht hooguit één geaccepteerd voorstel.
CREATE UNIQUE INDEX IF NOT EXISTS proposals_one_accepted ON public.proposals (job_id) WHERE status = 'geaccepteerd';
CREATE INDEX IF NOT EXISTS proposals_provider_idx ON public.proposals (provider_id, created_at DESC);

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_accepted_proposal_fk;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_accepted_proposal_fk
  FOREIGN KEY (accepted_proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;

-- ── Gesprekken na acceptatie ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (client_id <> provider_id)
);
CREATE INDEX IF NOT EXISTS conversations_client_idx ON public.conversations (client_id);
CREATE INDEX IF NOT EXISTS conversations_provider_idx ON public.conversations (provider_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 4000),
  attachment_path text,
  attachment_name text CHECK (char_length(attachment_name) <= 160),
  kind text NOT NULL DEFAULT 'bericht' CHECK (kind IN ('bericht', 'systeem')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(body) > 0 OR attachment_path IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.conversation_reads (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Vrijwillig gedeeld telefoonnummer, intrekbaar.
CREATE TABLE IF NOT EXISTS public.contact_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  shared_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS contact_shares_active ON public.contact_shares (conversation_id, user_id) WHERE revoked_at IS NULL;

-- ── Beoordelingen ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- de rol van degene die beoordeeld wordt
  reviewee_role text NOT NULL CHECK (reviewee_role IN ('professional', 'opdrachtgever')),
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rating_communication int CHECK (rating_communication BETWEEN 1 AND 5),
  rating_quality int CHECK (rating_quality BETWEEN 1 AND 5),
  rating_reliability int CHECK (rating_reliability BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  response text CHECK (char_length(response) <= 1500),
  response_at timestamptz,
  moderation_status text NOT NULL DEFAULT 'zichtbaar' CHECK (moderation_status IN ('zichtbaar', 'verborgen')),
  moderation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, reviewer_id),
  CHECK (reviewer_id <> reviewee_id)
);
CREATE INDEX IF NOT EXISTS reviews_reviewee_idx ON public.reviews (reviewee_id, created_at DESC);

-- ── Meldingen, favorieten, zoekopdrachten ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('professional', 'opdracht', 'dienst')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('opdrachten', 'professionals')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify boolean NOT NULL DEFAULT false,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_searches_user_idx ON public.saved_searches (user_id);

-- ── Veiligheid en moderatie ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('opdracht', 'profiel', 'dienst', 'bericht', 'beoordeling', 'vraag', 'bezwaar')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'oplichting', 'verboden_dienst', 'ongepast', 'contactgegevens', 'nep_beoordeling', 'minderjarige', 'intimidatie', 'anders', 'bezwaar')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_behandeling', 'afgehandeld', 'afgewezen')),
  resolution text CHECK (char_length(resolution) <= 2000),
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status, created_at);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log (created_at DESC);

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_events_idx ON public.rate_limit_events (user_id, action, created_at DESC);

-- ── Abonnementen ───────────────────────────────────────────────────────────

-- Alleen de server (service role, via de Stripe-webhook) schrijft hierin.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'pro' CHECK (plan IN ('pro')),
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_customers (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotentie van webhooks: elk event-id wordt één keer verwerkt.
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id text PRIMARY KEY,
  provider text NOT NULL,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

-- ── Kennisbank ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 10 AND 110),
  excerpt text NOT NULL DEFAULT '' CHECK (char_length(excerpt) <= 300),
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'gids' CHECK (kind IN ('prijsgids', 'gids', 'branche', 'starters')),
  author_id uuid REFERENCES public.authors(id),
  category_id int REFERENCES public.categories(id),
  status text NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'gepubliceerd', 'gearchiveerd')),
  seo_title text CHECK (char_length(seo_title) <= 70),
  seo_description text CHECK (char_length(seo_description) <= 170),
  -- [{title,url,accessed}] controleerbare bronnen
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_slugs text[] NOT NULL DEFAULT '{}',
  published_at timestamptz,
  reviewed_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS articles_touch ON public.articles;
CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Wachtlijst en e-mail ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' AND char_length(email) <= 200),
  role text NOT NULL CHECK (role IN ('opdrachtgever', 'professional', 'beide')),
  category_id int REFERENCES public.categories(id),
  place_id int REFERENCES public.places(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Uitgaande e-mail van de app (niet de Auth-mails van Supabase). De server
-- verstuurt pas als er een e-mailprovider is ingesteld.
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'wachtrij' CHECK (status IN ('wachtrij', 'verstuurd', 'mislukt')),
  attempts int NOT NULL DEFAULT 0,
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
