-- Jobmarkt: regels die de database zelf afdwingt.
--
-- Alle schrijfacties met bedrijfsregels (publiceren, voorstel sturen,
-- accepteren, statuswissels, beoordelen, moderatie) lopen via deze functies.
-- Ze draaien als SECURITY DEFINER met een lege search_path en controleren zelf
-- wie de aanroeper is (auth.uid()). Fouten hebben een vaste code in de
-- message, zodat de app een nette Nederlandse melding kan tonen.

-- ── Basis ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.setting(p_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT value FROM public.app_settings WHERE key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_role text, p_user uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user AND (role = p_role OR (p_role = 'moderator' AND role = 'admin'))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.has_role('admin'); $$;

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.has_role('moderator'); $$;

CREATE OR REPLACE FUNCTION public.user_age(p_user uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT date_part('year', age((now() AT TIME ZONE 'Europe/Amsterdam')::date, birthdate))::int
  FROM public.profile_private WHERE id = p_user;
$$;

-- Mag deze gebruiker overeenkomsten aangaan (opdracht plaatsen, voorstel
-- sturen of accepteren)? 18+ altijd; 16 en 17 alleen met bevestigde
-- ouderlijke toestemming. Zonder geboortedatum: nee.
CREATE OR REPLACE FUNCTION public.can_contract(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN pp.birthdate IS NULL THEN false
    WHEN public.user_age(p_user) >= 18 THEN true
    WHEN public.user_age(p_user) >= 16 THEN pp.guardian_consent_status = 'bevestigd'
    ELSE false
  END
  FROM public.profile_private pp WHERE pp.id = p_user;
$$;

CREATE OR REPLACE FUNCTION public.intro_period_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce((public.setting('intro_period_until') #>> '{}')::date >= (now() AT TIME ZONE 'Europe/Amsterdam')::date, false);
$$;

CREATE OR REPLACE FUNCTION public.has_paid_pro(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;

-- Pro-rechten: betaald abonnement, of de introductieperiode loopt.
CREATE OR REPLACE FUNCTION public.has_pro(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_paid_pro(p_user) OR public.intro_period_active();
$$;

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(p_action text, p_max int, p_window interval)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'niet_ingelogd';
  END IF;
  SELECT count(*) INTO v_count FROM public.rate_limit_events
  WHERE user_id = auth.uid() AND action = p_action AND created_at > now() - p_window;
  IF v_count >= p_max THEN
    RAISE EXCEPTION 'te_veel_acties:%', p_action;
  END IF;
  INSERT INTO public.rate_limit_events (user_id, action) VALUES (auth.uid(), p_action);
END;
$$;

CREATE OR REPLACE FUNCTION public.contains_contact_details(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(p_text, '') ~* '[a-z0-9._%+-]+\s*(@|\(at\)|\[at\])\s*[a-z0-9.-]+\.[a-z]{2,}'
      OR regexp_replace(coalesce(p_text, ''), '[\s().-]', '', 'g') ~ '(\+31|0031|06)[0-9]{8}'
      OR regexp_replace(coalesce(p_text, ''), '[\s().-]', '', 'g') ~ '(\+|00)[1-9][0-9]{9,13}'
      OR coalesce(p_text, '') ~* '(https?://|www\.)';
$$;

-- Signaalwoorden voor diensten die niet op Jobmarkt horen. Een treffer
-- blokkeert niet automatisch, maar zet de opdracht in de moderatiewachtrij.
CREATE OR REPLACE FUNCTION public.needs_moderation(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(p_text, '') ~* '(escort|erotisch|seks|sexy|wiet|cannabis|drugs|cocaïne|xtc|vuurwapen|wapen|munitie|vervalsen|nep ?diploma|scriptie schrijven|tentamen maken|reviews? kopen|volgers kopen|hack(en)? van|wachtwoord kraken|asbest verwijderen|taxi|personenvervoer|beveiliger|kinderopvang|witwassen|contant zwart|zwart geld|bitcoin|crypto)'
      OR coalesce(p_text, '') ~* '(https?://|www\.)';
$$;

-- Aantallen voor limieten in policies (een policy die zijn eigen tabel telt
-- zou recursief worden).
CREATE OR REPLACE FUNCTION public.owned_count(p_kind text, p_ref uuid DEFAULT NULL)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_kind
    WHEN 'concept_jobs' THEN (SELECT count(*) FROM public.jobs WHERE client_id = auth.uid() AND status = 'concept')
    WHEN 'job_attachments' THEN (SELECT count(*) FROM public.job_attachments WHERE job_id = p_ref)
    WHEN 'portfolio' THEN (SELECT count(*) FROM public.portfolio_items WHERE profile_id = auth.uid())
    WHEN 'services' THEN (SELECT count(*) FROM public.services WHERE provider_id = auth.uid() AND status <> 'verwijderd')
    WHEN 'favorites' THEN (SELECT count(*) FROM public.favorites WHERE user_id = auth.uid())
    WHEN 'saved_searches' THEN (SELECT count(*) FROM public.saved_searches WHERE user_id = auth.uid())
  END::int;
$$;

CREATE OR REPLACE FUNCTION public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (p_user, p_kind, p_title, coalesce(p_body, ''), p_link);
$$;

CREATE OR REPLACE FUNCTION public.audit(p_action text, p_target_type text, p_target_id text, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_between(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = a AND blocked_id = b) OR (blocker_id = b AND blocked_id = a)
  );
$$;

CREATE OR REPLACE FUNCTION public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

CREATE OR REPLACE FUNCTION public.category_and_children(p_slug text)
RETURNS SETOF int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id FROM public.categories c WHERE c.slug = p_slug
  UNION
  SELECT ch.id FROM public.categories ch JOIN public.categories p ON ch.parent_id = p.id WHERE p.slug = p_slug;
$$;

-- ── Nieuwe gebruiker ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', ''), 60))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profile_private (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Zoekvectoren en slugs ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.jobs_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- een al gepubliceerde opdracht die inhoudelijk wordt aangepast, gaat
  -- opnieuw door dezelfde controle als bij publiceren
  IF TG_OP = 'UPDATE' AND NEW.status = 'open' AND NEW.moderation_status = 'ok'
     AND (NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description)
     AND (public.needs_moderation(NEW.title || ' ' || NEW.description)
          OR public.contains_contact_details(NEW.title || ' ' || NEW.description)) THEN
    NEW.moderation_status := 'in_beoordeling';
  END IF;
  NEW.slug := left(public.slugify(NEW.title), 70);
  NEW.search_vector :=
    setweight(to_tsvector('dutch', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('dutch', coalesce(NEW.description, '')), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS jobs_before_write ON public.jobs;
CREATE TRIGGER jobs_before_write BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.jobs_before_write();

CREATE OR REPLACE FUNCTION public.profiles_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('dutch', coalesce(NEW.display_name, '') || ' ' || coalesce(NEW.company_name, '')), 'A') ||
    setweight(to_tsvector('dutch', coalesce(NEW.headline, '') || ' ' || array_to_string(NEW.skills, ' ')), 'A') ||
    setweight(to_tsvector('dutch', coalesce(NEW.bio, '')), 'C');
  IF NEW.provider_type = 'particulier' THEN
    NEW.company_name := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_before_write ON public.profiles;
CREATE TRIGGER profiles_before_write BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_before_write();

-- Profielcategorieën: maximaal tien per profiel.
CREATE OR REPLACE FUNCTION public.profile_categories_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT count(*) FROM public.profile_categories WHERE profile_id = NEW.profile_id) >= 10 THEN
    RAISE EXCEPTION 'max_categorieen';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profile_categories_limit ON public.profile_categories;
CREATE TRIGGER profile_categories_limit BEFORE INSERT ON public.profile_categories
  FOR EACH ROW EXECUTE FUNCTION public.profile_categories_limit();

-- ── Onboarding en leeftijd ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_birthdate date,
  p_display_name text,
  p_username text,
  p_is_provider boolean,
  p_terms_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing date;
  v_age int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'niet_ingelogd'; END IF;
  SELECT birthdate INTO v_existing FROM public.profile_private WHERE id = v_uid;
  IF v_existing IS NOT NULL AND v_existing <> p_birthdate THEN
    -- geboortedatum wijzigen kan alleen via support (voorkomt leeftijdsomzeiling)
    RAISE EXCEPTION 'geboortedatum_vast';
  END IF;
  v_age := date_part('year', age((now() AT TIME ZONE 'Europe/Amsterdam')::date, p_birthdate))::int;
  IF v_age < 16 THEN RAISE EXCEPTION 'te_jong'; END IF;
  IF v_age > 120 THEN RAISE EXCEPTION 'ongeldige_geboortedatum'; END IF;
  IF char_length(trim(coalesce(p_display_name, ''))) < 2 THEN RAISE EXCEPTION 'naam_te_kort'; END IF;
  IF p_username IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username AND id <> v_uid) THEN
    RAISE EXCEPTION 'gebruikersnaam_bezet';
  END IF;

  UPDATE public.profile_private SET
    birthdate = p_birthdate,
    accepted_terms_version = p_terms_version,
    accepted_terms_at = now(),
    guardian_consent_status = CASE WHEN v_age >= 18 THEN 'niet_nodig' ELSE guardian_consent_status END
  WHERE id = v_uid;

  UPDATE public.profiles SET
    display_name = trim(p_display_name),
    username = coalesce(p_username, username),
    is_provider = coalesce(p_is_provider, is_provider),
    -- minderjarigen: leeftijd nooit openbaar
    show_age = CASE WHEN v_age < 18 THEN false ELSE show_age END
  WHERE id = v_uid;

  RETURN jsonb_build_object('age_group', CASE WHEN v_age >= 18 THEN 'volwassen' ELSE 'minderjarig' END);
END;
$$;

-- Openbare leeftijd: alleen volwassenen die dat zelf aanzetten.
CREATE OR REPLACE FUNCTION public.public_age(p_user uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE WHEN p.show_age AND public.user_age(p.id) >= 18 THEN public.user_age(p.id) END
  FROM public.profiles p WHERE p.id = p_user;
$$;

-- Status voor de eigen gebruiker (geen geboortedatum terug naar de client
-- buiten de eigen privérij).
CREATE OR REPLACE FUNCTION public.my_account_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'onboarded', pp.birthdate IS NOT NULL AND p.username IS NOT NULL,
    'is_minor', coalesce(public.user_age(p.id) < 18, false),
    'can_contract', coalesce(public.can_contract(p.id), false),
    'guardian_consent_status', pp.guardian_consent_status,
    'has_pro', public.has_pro(p.id),
    'has_paid_pro', public.has_paid_pro(p.id),
    'intro_period', public.intro_period_active(),
    'is_admin', public.has_role('admin', p.id),
    'is_moderator', public.has_role('moderator', p.id),
    'proposals_this_month', (
      SELECT count(*) FROM public.proposals pr
      WHERE pr.provider_id = p.id AND pr.counts_toward_quota
        AND pr.created_at >= (date_trunc('month', now() AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'Europe/Amsterdam')
    ),
    'proposal_limit', CASE WHEN public.has_pro(p.id) THEN NULL
      ELSE (public.setting('plan_limits') #>> '{gratis,proposals_per_month}')::int END,
    'unread_notifications', (SELECT count(*) FROM public.notifications n WHERE n.user_id = p.id AND n.read_at IS NULL),
    'unread_messages', (
      SELECT count(*) FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      LEFT JOIN public.conversation_reads r ON r.conversation_id = c.id AND r.user_id = p.id
      WHERE (c.client_id = p.id OR c.provider_id = p.id)
        AND m.sender_id IS DISTINCT FROM p.id
        AND m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    )
  )
  FROM public.profiles p JOIN public.profile_private pp ON pp.id = p.id
  WHERE p.id = auth.uid();
$$;

-- Ouderlijke toestemming aanvragen: zet een eenmalige link klaar in de
-- e-mailwachtrij. De token zelf wordt niet opgeslagen, alleen de hash.
CREATE OR REPLACE FUNCTION public.request_guardian_consent(p_guardian_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_age int := public.user_age(auth.uid());
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'niet_ingelogd'; END IF;
  IF v_age IS NULL OR v_age >= 18 THEN RAISE EXCEPTION 'niet_nodig'; END IF;
  IF p_guardian_email !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' THEN RAISE EXCEPTION 'ongeldig_email'; END IF;
  IF lower(p_guardian_email) = lower((SELECT email FROM auth.users WHERE id = v_uid)) THEN
    RAISE EXCEPTION 'eigen_email';
  END IF;
  PERFORM public.enforce_rate_limit('guardian_consent', 3, interval '1 day');
  UPDATE public.profile_private SET
    guardian_email = lower(p_guardian_email),
    guardian_consent_status = 'aangevraagd',
    guardian_consent_token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
  WHERE id = v_uid;
  INSERT INTO public.email_outbox (to_email, template, payload)
  VALUES (lower(p_guardian_email), 'ouderlijke_toestemming', jsonb_build_object(
    'token', v_token,
    'child_name', (SELECT display_name FROM public.profiles WHERE id = v_uid)
  ));
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_guardian_consent(p_token text, p_guardian_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF char_length(trim(coalesce(p_guardian_name, ''))) < 3 THEN RAISE EXCEPTION 'naam_te_kort'; END IF;
  SELECT id INTO v_id FROM public.profile_private
  WHERE guardian_consent_token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
    AND guardian_consent_status = 'aangevraagd';
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE public.profile_private SET
    guardian_consent_status = 'bevestigd',
    guardian_consent_at = now(),
    guardian_consent_token_hash = NULL
  WHERE id = v_id;
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, details)
  VALUES (NULL, 'ouderlijke_toestemming_bevestigd', 'profiel', v_id::text,
    jsonb_build_object('guardian_name', left(trim(p_guardian_name), 120)));
  PERFORM public.notify(v_id, 'toestemming', 'Toestemming bevestigd',
    'Je ouder of voogd heeft toestemming gegeven. Je kunt nu opdrachten plaatsen en voorstellen sturen.', '/account');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_guardian_consent()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.profile_private SET guardian_consent_status = 'ingetrokken', guardian_consent_token_hash = NULL
  WHERE id = auth.uid() AND guardian_consent_status IN ('aangevraagd', 'bevestigd');
$$;

-- ── Opdrachten ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_job_status(p_job uuid, p_from text, p_to text, p_note text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.job_status_history (job_id, from_status, to_status, actor_id, note)
  VALUES (p_job, p_from, p_to, auth.uid(), p_note);
$$;

CREATE OR REPLACE FUNCTION public.publish_job(p_job uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  j public.jobs;
  c public.categories;
  v_flag boolean;
  v_days int := coalesce((public.setting('job_expiry_days') #>> '{}')::int, 30);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'niet_ingelogd'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF j.id IS NULL OR j.client_id <> v_uid THEN RAISE EXCEPTION 'niet_gevonden'; END IF;
  IF j.status <> 'concept' THEN RAISE EXCEPTION 'ongeldige_status'; END IF;
  IF NOT public.can_contract(v_uid) THEN RAISE EXCEPTION 'leeftijd_of_toestemming'; END IF;
  IF (SELECT status FROM public.profiles WHERE id = v_uid) <> 'actief' THEN RAISE EXCEPTION 'account_geschorst'; END IF;
  SELECT * INTO c FROM public.categories WHERE id = j.category_id;
  IF NOT c.is_active THEN RAISE EXCEPTION 'categorie_niet_actief'; END IF;
  IF j.work_mode = 'op_locatie' AND j.place_id IS NULL THEN RAISE EXCEPTION 'plaats_verplicht'; END IF;
  IF j.budget_type <> 'in_overleg' AND j.budget_min_cents IS NULL AND j.budget_max_cents IS NULL THEN
    RAISE EXCEPTION 'budget_verplicht';
  END IF;
  PERFORM public.enforce_rate_limit('publish_job',
    coalesce((public.setting('anti_spam') #>> '{jobs_per_day}')::int, 5), interval '1 day');

  v_flag := public.needs_moderation(j.title || ' ' || j.description)
    OR public.contains_contact_details(j.title || ' ' || j.description);

  UPDATE public.jobs SET
    status = 'open',
    moderation_status = CASE WHEN v_flag THEN 'in_beoordeling' ELSE 'ok' END,
    published_at = now(),
    expires_at = now() + make_interval(days => v_days)
  WHERE id = p_job;
  PERFORM public.log_job_status(p_job, 'concept', 'open', CASE WHEN v_flag THEN 'automatisch in moderatie' END);
  RETURN CASE WHEN v_flag THEN 'in_beoordeling' ELSE 'open' END;
END;
$$;

-- Toegestane statuswissels. Accepteren (open → toegewezen) gaat alleen via
-- accept_proposal; geschillen worden door beheer afgesloten.
CREATE OR REPLACE FUNCTION public.transition_job(p_job uuid, p_to text, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  j public.jobs;
  v_role text;
  v_ok boolean := false;
  v_other uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'niet_ingelogd'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'niet_gevonden'; END IF;
  v_role := CASE
    WHEN j.client_id = v_uid THEN 'client'
    WHEN j.assigned_provider_id = v_uid THEN 'provider'
    ELSE NULL END;
  IF v_role IS NULL THEN RAISE EXCEPTION 'geen_toegang'; END IF;

  v_ok := CASE
    WHEN j.status = 'concept'     AND p_to = 'verwijderd'  AND v_role = 'client' THEN true
    WHEN j.status = 'open'        AND p_to = 'geannuleerd' AND v_role = 'client' THEN true
    WHEN j.status = 'toegewezen'  AND p_to = 'bezig'       AND v_role = 'provider' THEN true
    WHEN j.status = 'toegewezen'  AND p_to = 'geannuleerd' THEN true
    WHEN j.status = 'bezig'       AND p_to = 'opgeleverd'  AND v_role = 'provider' THEN true
    WHEN j.status = 'opgeleverd'  AND p_to = 'afgerond'    AND v_role = 'client' THEN true
    WHEN j.status = 'opgeleverd'  AND p_to = 'bezig'       AND v_role = 'client' THEN true
    WHEN j.status IN ('toegewezen', 'bezig', 'opgeleverd') AND p_to = 'geschil' THEN true
    ELSE false
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'ongeldige_overgang:%->%', j.status, p_to; END IF;
  IF p_to IN ('geannuleerd', 'geschil') AND char_length(trim(coalesce(p_note, ''))) < 5 THEN
    RAISE EXCEPTION 'reden_verplicht';
  END IF;

  UPDATE public.jobs SET
    status = p_to,
    completed_at = CASE WHEN p_to = 'afgerond' THEN now() ELSE completed_at END,
    closed_at = CASE WHEN p_to IN ('afgerond', 'geannuleerd', 'verwijderd') THEN now() ELSE closed_at END
  WHERE id = p_job;

  IF p_to = 'geannuleerd' AND j.status = 'open' THEN
    UPDATE public.proposals SET status = 'gesloten', updated_at = now()
    WHERE job_id = p_job AND status = 'verstuurd';
  END IF;

  PERFORM public.log_job_status(p_job, j.status, p_to, p_note);

  v_other := CASE WHEN v_role = 'client' THEN j.assigned_provider_id ELSE j.client_id END;
  IF v_other IS NOT NULL THEN
    PERFORM public.notify(v_other, 'opdracht_status',
      CASE p_to
        WHEN 'bezig' THEN 'De professional is begonnen'
        WHEN 'opgeleverd' THEN 'Opdracht opgeleverd: controleer en rond af'
        WHEN 'afgerond' THEN 'Opdracht afgerond: laat een beoordeling achter'
        WHEN 'geschil' THEN 'Er is een geschil gemeld'
        WHEN 'geannuleerd' THEN 'Opdracht geannuleerd'
        ELSE 'Status van opdracht gewijzigd' END,
      j.title, '/account/opdrachten/' || j.id);
    IF p_to IN ('bezig', 'opgeleverd', 'afgerond', 'geschil', 'geannuleerd') THEN
      INSERT INTO public.messages (conversation_id, sender_id, body, kind)
      SELECT c.id, NULL, 'Status gewijzigd naar: ' || replace(p_to, '_', ' ')
        || CASE WHEN p_note IS NOT NULL AND p_to IN ('geschil', 'geannuleerd') THEN ' (' || left(p_note, 300) || ')' ELSE '' END,
        'systeem'
      FROM public.conversations c WHERE c.job_id = p_job;
    END IF;
  END IF;
END;
$$;

-- Verlopen opdrachten sluiten (pg_cron of de dagelijkse server-taak).
CREATE OR REPLACE FUNCTION public.expire_jobs()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.jobs SET status = 'verlopen', closed_at = now()
    WHERE status = 'open' AND expires_at < now()
    RETURNING id, client_id, title
  ), closed AS (
    UPDATE public.proposals p SET status = 'gesloten', updated_at = now()
    FROM expired e WHERE p.job_id = e.id AND p.status = 'verstuurd'
    RETURNING p.id
  ), notified AS (
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    SELECT client_id, 'opdracht_verlopen', 'Je opdracht is verlopen', title, '/account/opdrachten/' || id FROM expired
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

-- ── Vragen vóór acceptatie ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ask_question(p_job uuid, p_question text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  j public.jobs;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'niet_ingelogd'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = p_job;
  IF j.id IS NULL OR j.status <> 'open' OR j.moderation_status <> 'ok' THEN RAISE EXCEPTION 'niet_open'; END IF;
  IF j.client_id = v_uid THEN RAISE EXCEPTION 'eigen_opdracht'; END IF;
  IF public.is_blocked_between(v_uid, j.client_id) THEN RAISE EXCEPTION 'geblokkeerd'; END IF;
  IF public.contains_contact_details(p_question) THEN RAISE EXCEPTION 'contactgegevens'; END IF;
  PERFORM public.enforce_rate_limit('ask_question',
    coalesce((public.setting('anti_spam') #>> '{questions_per_day}')::int, 10), interval '1 day');
  INSERT INTO public.job_questions (job_id, asker_id, question) VALUES (p_job, v_uid, trim(p_question))
  RETURNING id INTO v_id;
  PERFORM public.notify(j.client_id, 'vraag', 'Nieuwe vraag over je opdracht', j.title, '/opdrachten/' || j.slug || '-' || j.code || '#vragen');
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.answer_question(p_question uuid, p_answer text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  q public.job_questions;
  j public.jobs;
BEGIN
  SELECT * INTO q FROM public.job_questions WHERE id = p_question;
  SELECT * INTO j FROM public.jobs WHERE id = q.job_id;
  IF j.client_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  IF public.contains_contact_details(p_answer) THEN RAISE EXCEPTION 'contactgegevens'; END IF;
  IF char_length(trim(coalesce(p_answer, ''))) < 2 THEN RAISE EXCEPTION 'antwoord_te_kort'; END IF;
  UPDATE public.job_questions SET answer = trim(p_answer), answered_at = now() WHERE id = p_question;
  PERFORM public.notify(q.asker_id, 'antwoord', 'Je vraag is beantwoord', j.title, '/opdrachten/' || j.slug || '-' || j.code || '#vragen');
END;
$$;

-- ── Voorstellen ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_proposal(
  p_job uuid,
  p_price_type text,
  p_amount_cents int,
  p_estimated_hours numeric,
  p_message text,
  p_planning text,
  p_available_from date,
  p_portfolio_item_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  j public.jobs;
  c public.categories;
  v_age int;
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'Europe/Amsterdam';
  v_used int;
  v_limit int;
  v_id uuid;
  v_pro boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'niet_ingelogd'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF j.id IS NULL OR j.status <> 'open' OR j.moderation_status <> 'ok' OR j.expires_at < now() THEN
    RAISE EXCEPTION 'niet_open';
  END IF;
  IF j.client_id = v_uid THEN RAISE EXCEPTION 'eigen_opdracht'; END IF;
  IF (SELECT status FROM public.profiles WHERE id = v_uid) <> 'actief' THEN RAISE EXCEPTION 'account_geschorst'; END IF;
  IF public.is_blocked_between(v_uid, j.client_id) THEN RAISE EXCEPTION 'geblokkeerd'; END IF;
  IF NOT public.can_contract(v_uid) THEN RAISE EXCEPTION 'leeftijd_of_toestemming'; END IF;

  SELECT * INTO c FROM public.categories WHERE id = j.category_id;
  v_age := public.user_age(v_uid);
  IF v_age < c.min_age THEN RAISE EXCEPTION 'categorie_18_plus'; END IF;

  -- passend: de categorie (of de hoofdcategorie) staat in het profiel
  IF NOT EXISTS (
    SELECT 1 FROM public.profile_categories pc
    WHERE pc.profile_id = v_uid AND (pc.category_id = c.id OR pc.category_id = c.parent_id)
  ) THEN
    RAISE EXCEPTION 'categorie_niet_in_profiel';
  END IF;

  IF j.proposal_count >= coalesce((public.setting('anti_spam') #>> '{max_proposals_per_job}')::int, 25) THEN
    RAISE EXCEPTION 'opdracht_vol';
  END IF;

  IF public.contains_contact_details(p_message || ' ' || coalesce(p_planning, '')) THEN
    RAISE EXCEPTION 'contactgegevens';
  END IF;

  v_pro := public.has_pro(v_uid);
  IF NOT v_pro THEN
    SELECT count(*) INTO v_used FROM public.proposals
    WHERE provider_id = v_uid AND counts_toward_quota AND created_at >= v_month_start;
    v_limit := coalesce((public.setting('plan_limits') #>> '{gratis,proposals_per_month}')::int, 5);
    IF v_used >= v_limit THEN RAISE EXCEPTION 'limiet_bereikt'; END IF;
  END IF;
  -- anti-spam voor iedereen, ook Pro
  PERFORM public.enforce_rate_limit('submit_proposal',
    coalesce((public.setting('anti_spam') #>> '{proposals_per_day}')::int, 15), interval '1 day');

  -- alleen eigen portfolio-items meesturen
  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_portfolio_item_ids, '{}')) AS x(id)
    WHERE NOT EXISTS (SELECT 1 FROM public.portfolio_items pi WHERE pi.id = x.id AND pi.profile_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'portfolio_niet_van_jou';
  END IF;

  INSERT INTO public.proposals (job_id, provider_id, price_type, amount_cents, estimated_hours, message, planning, available_from, portfolio_item_ids)
  VALUES (p_job, v_uid, p_price_type, p_amount_cents, p_estimated_hours, trim(p_message), trim(coalesce(p_planning, '')), p_available_from, coalesce(p_portfolio_item_ids, '{}'))
  RETURNING id INTO v_id;

  UPDATE public.jobs SET proposal_count = proposal_count + 1 WHERE id = p_job;
  PERFORM public.notify(j.client_id, 'voorstel', 'Nieuw voorstel ontvangen', j.title, '/account/opdrachten/' || j.id);
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN RAISE EXCEPTION 'al_gereageerd';
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_proposal(p_proposal uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.proposals SET status = 'ingetrokken', updated_at = now()
  WHERE id = p_proposal AND provider_id = auth.uid() AND status = 'verstuurd';
  IF NOT FOUND THEN RAISE EXCEPTION 'niet_mogelijk'; END IF;
  -- het voorstel blijft meetellen voor de maandlimiet (voorkomt omzeilen)
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_proposal(p_proposal uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  p public.proposals;
  j public.jobs;
BEGIN
  SELECT * INTO p FROM public.proposals WHERE id = p_proposal;
  SELECT * INTO j FROM public.jobs WHERE id = p.job_id;
  IF j.client_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  IF p.status <> 'verstuurd' THEN RAISE EXCEPTION 'niet_mogelijk'; END IF;
  UPDATE public.proposals SET status = 'afgewezen', updated_at = now() WHERE id = p_proposal;
  PERFORM public.notify(p.provider_id, 'voorstel_afgewezen', 'Je voorstel is niet gekozen', j.title, '/account/voorstellen');
END;
$$;

-- Atomair accepteren: de opdracht wordt vergrendeld (FOR UPDATE). Een
-- tweede gelijktijdige poging wacht en ziet daarna status 'toegewezen'.
-- De unieke index proposals_one_accepted is de laatste vangrail.
CREATE OR REPLACE FUNCTION public.accept_proposal(p_proposal uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  p public.proposals;
  j public.jobs;
  v_conv uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'niet_ingelogd'; END IF;
  SELECT * INTO p FROM public.proposals WHERE id = p_proposal;
  IF p.id IS NULL THEN RAISE EXCEPTION 'niet_gevonden'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = p.job_id FOR UPDATE;
  IF j.client_id <> v_uid THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  IF j.status <> 'open' THEN RAISE EXCEPTION 'niet_open'; END IF;
  -- opnieuw lezen ná de vergrendeling
  SELECT * INTO p FROM public.proposals WHERE id = p_proposal FOR UPDATE;
  IF p.status <> 'verstuurd' THEN RAISE EXCEPTION 'voorstel_niet_beschikbaar'; END IF;
  IF NOT public.can_contract(v_uid) THEN RAISE EXCEPTION 'leeftijd_of_toestemming'; END IF;
  IF NOT public.can_contract(p.provider_id)
     OR (SELECT status FROM public.profiles WHERE id = p.provider_id) <> 'actief' THEN
    RAISE EXCEPTION 'professional_kan_niet';
  END IF;
  IF public.is_blocked_between(v_uid, p.provider_id) THEN RAISE EXCEPTION 'geblokkeerd'; END IF;

  UPDATE public.proposals SET status = 'geaccepteerd', updated_at = now() WHERE id = p.id;
  UPDATE public.proposals SET status = 'gesloten', updated_at = now()
  WHERE job_id = j.id AND id <> p.id AND status = 'verstuurd';
  UPDATE public.jobs SET status = 'toegewezen', assigned_provider_id = p.provider_id, accepted_proposal_id = p.id
  WHERE id = j.id;
  PERFORM public.log_job_status(j.id, 'open', 'toegewezen', NULL);

  INSERT INTO public.conversations (job_id, client_id, provider_id, last_message_at)
  VALUES (j.id, j.client_id, p.provider_id, now())
  RETURNING id INTO v_conv;
  INSERT INTO public.messages (conversation_id, sender_id, body, kind)
  VALUES (v_conv, NULL, 'Voorstel geaccepteerd. Dit gesprek is alleen zichtbaar voor jullie twee.', 'systeem');

  PERFORM public.notify(p.provider_id, 'voorstel_geaccepteerd', 'Je voorstel is geaccepteerd', j.title, '/berichten/' || v_conv);
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  SELECT pr.provider_id, 'opdracht_gesloten', 'Opdracht is aan iemand anders gegeven', j.title, '/account/voorstellen'
  FROM public.proposals pr WHERE pr.job_id = j.id AND pr.status = 'gesloten' AND pr.provider_id <> p.provider_id;
  RETURN v_conv;
END;
$$;

-- ── Gesprekken ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation uuid, p_user uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation AND (client_id = p_user OR provider_id = p_user)
  );
$$;

-- Moderators mogen een gesprek alleen inzien zolang er een open melding
-- over een bericht in dat gesprek is.
CREATE OR REPLACE FUNCTION public.conversation_under_report(p_conversation uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_moderator() AND EXISTS (
    SELECT 1 FROM public.reports r JOIN public.messages m ON m.id = r.target_id
    WHERE r.target_type = 'bericht' AND m.conversation_id = p_conversation
      AND r.status IN ('open', 'in_behandeling')
  );
$$;

CREATE OR REPLACE FUNCTION public.messages_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c public.conversations;
BEGIN
  IF NEW.kind = 'systeem' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  IF public.is_blocked_between(c.client_id, c.provider_id) THEN RAISE EXCEPTION 'geblokkeerd'; END IF;
  IF NEW.attachment_path IS NOT NULL AND split_part(NEW.attachment_path, '/', 1) <> NEW.conversation_id::text THEN
    RAISE EXCEPTION 'ongeldige_bijlage';
  END IF;
  PERFORM public.enforce_rate_limit('send_message',
    coalesce((public.setting('anti_spam') #>> '{messages_per_minute}')::int, 20), interval '1 minute');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS messages_before_insert ON public.messages;
CREATE TRIGGER messages_before_insert BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_before_insert();

CREATE OR REPLACE FUNCTION public.messages_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c public.conversations;
  v_to uuid;
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id
  RETURNING * INTO c;
  IF NEW.kind = 'bericht' THEN
    v_to := CASE WHEN NEW.sender_id = c.client_id THEN c.provider_id ELSE c.client_id END;
    -- één ongelezen melding per gesprek is genoeg
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_to AND kind = 'bericht' AND link = '/berichten/' || c.id AND read_at IS NULL
    ) THEN
      PERFORM public.notify(v_to, 'bericht', 'Nieuw bericht', (SELECT title FROM public.jobs WHERE id = c.job_id), '/berichten/' || c.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS messages_after_insert ON public.messages;
CREATE TRIGGER messages_after_insert AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_after_insert();

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_conversation_participant(p_conversation) THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  INSERT INTO public.conversation_reads (conversation_id, user_id, last_read_at)
  VALUES (p_conversation, auth.uid(), now())
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_at = now();
  UPDATE public.notifications SET read_at = now()
  WHERE user_id = auth.uid() AND kind = 'bericht' AND link = '/berichten/' || p_conversation AND read_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.share_phone(p_conversation uuid, p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[\s().-]', '', 'g');
  c public.conversations;
BEGIN
  IF NOT public.is_conversation_participant(p_conversation) THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  SELECT * INTO c FROM public.conversations WHERE id = p_conversation;
  IF public.is_blocked_between(c.client_id, c.provider_id) THEN RAISE EXCEPTION 'geblokkeerd'; END IF;
  IF v_phone ~ '^0[1-9][0-9]{8}$' THEN v_phone := '+31' || substr(v_phone, 2); END IF;
  IF v_phone ~ '^00[1-9]' THEN v_phone := '+' || substr(v_phone, 3); END IF;
  IF v_phone !~ '^\+[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'ongeldig_nummer'; END IF;
  UPDATE public.contact_shares SET revoked_at = now()
  WHERE conversation_id = p_conversation AND user_id = auth.uid() AND revoked_at IS NULL;
  INSERT INTO public.contact_shares (conversation_id, user_id, phone) VALUES (p_conversation, auth.uid(), v_phone);
  INSERT INTO public.messages (conversation_id, sender_id, body, kind)
  VALUES (p_conversation, NULL, (SELECT display_name FROM public.profiles WHERE id = auth.uid()) || ' heeft een telefoonnummer gedeeld.', 'systeem');
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_phone(p_conversation uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.contact_shares SET revoked_at = now()
  WHERE conversation_id = p_conversation AND user_id = auth.uid() AND revoked_at IS NULL;
  IF FOUND THEN
    INSERT INTO public.messages (conversation_id, sender_id, body, kind)
    VALUES (p_conversation, NULL, (SELECT display_name FROM public.profiles WHERE id = auth.uid()) || ' heeft het gedeelde telefoonnummer ingetrokken.', 'systeem');
  END IF;
END;
$$;

-- ── Beoordelingen ──────────────────────────────────────────────────────────

-- Gepubliceerd = zichtbaar én (beide partijen hebben beoordeeld óf de
-- dubbelblinde periode na afronden is voorbij).
CREATE OR REPLACE FUNCTION public.review_is_published(r public.reviews)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.moderation_status = 'zichtbaar' AND (
    EXISTS (SELECT 1 FROM public.reviews o WHERE o.job_id = r.job_id AND o.reviewer_id = r.reviewee_id)
    OR (SELECT completed_at FROM public.jobs WHERE id = r.job_id)
       + make_interval(days => coalesce((public.setting('review_blind_days') #>> '{}')::int, 14)) < now()
  );
$$;

CREATE OR REPLACE FUNCTION public.submit_review(
  p_job uuid,
  p_rating int,
  p_communication int,
  p_quality int,
  p_reliability int,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  j public.jobs;
  v_reviewee uuid;
  v_role text;
  v_id uuid;
  v_deadline int := coalesce((public.setting('review_deadline_days') #>> '{}')::int, 30);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'niet_ingelogd'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = p_job;
  IF j.id IS NULL OR j.status <> 'afgerond' THEN RAISE EXCEPTION 'niet_afgerond'; END IF;
  IF j.completed_at + make_interval(days => v_deadline) < now() THEN RAISE EXCEPTION 'termijn_verlopen'; END IF;
  IF v_uid = j.client_id THEN
    v_reviewee := j.assigned_provider_id; v_role := 'professional';
  ELSIF v_uid = j.assigned_provider_id THEN
    v_reviewee := j.client_id; v_role := 'opdrachtgever';
  ELSE
    RAISE EXCEPTION 'geen_deelnemer';
  END IF;
  IF v_reviewee IS NULL OR v_reviewee = v_uid THEN RAISE EXCEPTION 'geen_deelnemer'; END IF;
  IF public.contains_contact_details(p_body) THEN RAISE EXCEPTION 'contactgegevens'; END IF;

  INSERT INTO public.reviews (job_id, reviewer_id, reviewee_id, reviewee_role, rating, rating_communication, rating_quality, rating_reliability, body)
  VALUES (p_job, v_uid, v_reviewee, v_role, p_rating, p_communication,
    CASE WHEN v_role = 'professional' THEN p_quality END, p_reliability, trim(coalesce(p_body, '')))
  RETURNING id INTO v_id;
  PERFORM public.notify(v_reviewee, 'beoordeling', 'Je hebt een beoordeling ontvangen',
    'Je ziet hem zodra jij ook hebt beoordeeld, of uiterlijk na de wachtperiode.', '/account/beoordelingen');
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN RAISE EXCEPTION 'al_beoordeeld';
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_review(p_review uuid, p_response text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.reviews;
BEGIN
  SELECT * INTO r FROM public.reviews WHERE id = p_review;
  IF r.reviewee_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  IF NOT public.review_is_published(r) THEN RAISE EXCEPTION 'nog_niet_gepubliceerd'; END IF;
  IF r.response IS NOT NULL THEN RAISE EXCEPTION 'al_gereageerd'; END IF;
  IF char_length(trim(coalesce(p_response, ''))) < 5 THEN RAISE EXCEPTION 'reactie_te_kort'; END IF;
  IF public.contains_contact_details(p_response) THEN RAISE EXCEPTION 'contactgegevens'; END IF;
  UPDATE public.reviews SET response = trim(p_response), response_at = now() WHERE id = p_review;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_reviews(p_profile uuid, p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS TABLE (
  id uuid, job_title text, job_category text, reviewer_name text, reviewee_role text,
  rating int, rating_communication int, rating_quality int, rating_reliability int,
  body text, response text, response_at timestamptz, created_at timestamptz, completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.id, j.title, c.name, rp.display_name, r.reviewee_role,
    r.rating, r.rating_communication, r.rating_quality, r.rating_reliability,
    r.body, r.response, r.response_at, r.created_at, j.completed_at
  FROM public.reviews r
  JOIN public.jobs j ON j.id = r.job_id
  JOIN public.categories c ON c.id = j.category_id
  JOIN public.profiles rp ON rp.id = r.reviewer_id
  WHERE r.reviewee_id = p_profile AND public.review_is_published(r)
  ORDER BY r.created_at DESC
  LIMIT least(p_limit, 50) OFFSET greatest(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.profile_stats(p_profile uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'rating_avg', (SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r
                   WHERE r.reviewee_id = p_profile AND r.reviewee_role = 'professional' AND public.review_is_published(r)),
    'rating_count', (SELECT count(*) FROM public.reviews r
                     WHERE r.reviewee_id = p_profile AND r.reviewee_role = 'professional' AND public.review_is_published(r)),
    'client_rating_avg', (SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r
                   WHERE r.reviewee_id = p_profile AND r.reviewee_role = 'opdrachtgever' AND public.review_is_published(r)),
    'client_rating_count', (SELECT count(*) FROM public.reviews r
                     WHERE r.reviewee_id = p_profile AND r.reviewee_role = 'opdrachtgever' AND public.review_is_published(r)),
    'hidden_count', (SELECT count(*) FROM public.reviews r WHERE r.reviewee_id = p_profile AND r.moderation_status = 'verborgen'),
    'completed_as_provider', (SELECT count(*) FROM public.jobs j WHERE j.assigned_provider_id = p_profile AND j.status = 'afgerond'),
    'completed_as_client', (SELECT count(*) FROM public.jobs j WHERE j.client_id = p_profile AND j.status = 'afgerond')
  );
$$;

-- ── Zoeken ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_jobs(
  p_q text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_mode text DEFAULT NULL,
  p_place int DEFAULT NULL,
  p_radius_km int DEFAULT NULL,
  p_budget_type text DEFAULT NULL,
  p_min_budget_cents int DEFAULT NULL,
  p_sort text DEFAULT 'nieuw',
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, code text, slug text, title text, excerpt text,
  category_name text, category_slug text, work_mode text, place_name text, distance_km int,
  budget_type text, budget_min_cents int, budget_max_cents int, timing text, due_date date,
  published_at timestamptz, proposal_count int, match_score int, match_reasons text[], total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH me AS (
    SELECT p.id, p.skills, p.hourly_rate_cents, p.works_online, p.works_on_location, p.travel_radius_km,
      pl.lat, pl.lng,
      coalesce(array_agg(pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL), '{}') AS cats
    FROM public.profiles p
    LEFT JOIN public.places pl ON pl.id = p.place_id
    LEFT JOIN public.profile_categories pc ON pc.profile_id = p.id
    WHERE p.id = auth.uid()
    GROUP BY p.id, pl.lat, pl.lng
  ),
  origin AS (
    SELECT lat, lng FROM public.places WHERE id = p_place
  ),
  base AS (
    SELECT j.*, c.name AS category_name, c.slug AS category_slug, c.parent_id AS category_parent,
      pl.name AS place_name, pl.lat, pl.lng,
      CASE WHEN (SELECT lat FROM origin) IS NOT NULL AND pl.lat IS NOT NULL
        THEN public.distance_km((SELECT lat FROM origin), (SELECT lng FROM origin), pl.lat, pl.lng) END AS dist
    FROM public.jobs j
    JOIN public.categories c ON c.id = j.category_id
    LEFT JOIN public.places pl ON pl.id = j.place_id
    WHERE j.status = 'open' AND j.moderation_status = 'ok' AND j.expires_at > now()
      AND (p_category IS NULL OR j.category_id IN (SELECT public.category_and_children(p_category)))
      AND (p_mode IS NULL OR j.work_mode = p_mode)
      AND (p_budget_type IS NULL OR j.budget_type = p_budget_type)
      AND (p_min_budget_cents IS NULL OR coalesce(j.budget_max_cents, j.budget_min_cents) >= p_min_budget_cents)
      AND (p_q IS NULL OR p_q = '' OR j.search_vector @@ websearch_to_tsquery('dutch', p_q))
      AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = j.client_id AND b.blocked_id = auth.uid())
  ),
  filtered AS (
    SELECT b.* FROM base b
    WHERE p_radius_km IS NULL OR p_place IS NULL OR b.work_mode = 'online' OR b.dist <= p_radius_km
  ),
  scored AS (
    SELECT f.*,
      (CASE WHEN m.id IS NULL THEN 0 ELSE
        (CASE WHEN f.category_id = ANY(m.cats) OR f.category_parent = ANY(m.cats) THEN 40 ELSE 0 END)
        + (CASE WHEN f.search_vector @@ to_tsquery('dutch', coalesce(nullif(array_to_string(
              ARRAY(SELECT regexp_replace(s, '[^[:alnum:]]+', '', 'g') FROM unnest(m.skills) s WHERE regexp_replace(s, '[^[:alnum:]]+', '', 'g') <> ''), ' | '), ''), 'xxxgeenxxx'))
            THEN 20 ELSE 0 END)
        + (CASE WHEN f.work_mode = 'online' AND m.works_online THEN 20
                WHEN f.work_mode = 'op_locatie' AND m.works_on_location AND m.lat IS NOT NULL AND f.lat IS NOT NULL
                  AND public.distance_km(m.lat, m.lng, f.lat, f.lng) <= m.travel_radius_km THEN 20
                ELSE 0 END)
        + (CASE WHEN f.budget_type = 'uur' AND m.hourly_rate_cents IS NOT NULL
                  AND m.hourly_rate_cents <= coalesce(f.budget_max_cents, f.budget_min_cents) THEN 10
                WHEN f.budget_type = 'in_overleg' THEN 5 ELSE 0 END)
      END)::int AS score,
      CASE WHEN m.id IS NULL THEN '{}'::text[] ELSE array_remove(ARRAY[
        CASE WHEN f.category_id = ANY(m.cats) OR f.category_parent = ANY(m.cats) THEN 'Past bij je categorieën' END,
        CASE WHEN f.work_mode = 'online' AND m.works_online THEN 'Online, en je werkt online' END,
        CASE WHEN f.work_mode = 'op_locatie' AND m.works_on_location AND m.lat IS NOT NULL AND f.lat IS NOT NULL
             AND public.distance_km(m.lat, m.lng, f.lat, f.lng) <= m.travel_radius_km THEN 'Binnen je reisafstand' END,
        CASE WHEN f.budget_type = 'uur' AND m.hourly_rate_cents IS NOT NULL
             AND m.hourly_rate_cents <= coalesce(f.budget_max_cents, f.budget_min_cents) THEN 'Budget past bij je uurtarief' END
      ], NULL) END AS reasons
    FROM filtered f LEFT JOIN me m ON true
  )
  SELECT s.id, s.code, s.slug, s.title, left(s.description, 220), s.category_name, s.category_slug, s.work_mode,
    s.place_name, round(s.dist)::int, s.budget_type, s.budget_min_cents, s.budget_max_cents, s.timing, s.due_date,
    s.published_at, s.proposal_count, s.score, s.reasons, count(*) OVER ()
  FROM scored s
  ORDER BY
    CASE WHEN p_sort = 'match' THEN s.score END DESC NULLS LAST,
    CASE WHEN p_sort = 'afstand' THEN s.dist END ASC NULLS LAST,
    CASE WHEN p_sort = 'budget' THEN coalesce(s.budget_max_cents, s.budget_min_cents) END DESC NULLS LAST,
    s.published_at DESC, s.id
  LIMIT least(greatest(p_limit, 1), 50) OFFSET greatest(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.search_professionals(
  p_q text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_mode text DEFAULT NULL,
  p_place int DEFAULT NULL,
  p_radius_km int DEFAULT NULL,
  p_max_rate_cents int DEFAULT NULL,
  p_available boolean DEFAULT NULL,
  p_min_rating numeric DEFAULT NULL,
  p_sort text DEFAULT 'relevant',
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, username text, display_name text, avatar_path text, headline text, place_name text, distance_km int,
  works_online boolean, works_on_location boolean, hourly_rate_cents int, provider_type text, company_name text,
  availability text, kvk_verified boolean, rating_avg numeric, rating_count bigint, completed_count bigint,
  categories text[], match_reasons text[], total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH origin AS (
    SELECT lat, lng FROM public.places WHERE id = p_place
  ),
  base AS (
    SELECT p.*, pl.name AS place_name,
      CASE WHEN (SELECT lat FROM origin) IS NOT NULL AND pl.lat IS NOT NULL
        THEN public.distance_km((SELECT lat FROM origin), (SELECT lng FROM origin), pl.lat, pl.lng) END AS dist,
      (SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r
        WHERE r.reviewee_id = p.id AND r.reviewee_role = 'professional' AND public.review_is_published(r)) AS r_avg,
      (SELECT count(*) FROM public.reviews r
        WHERE r.reviewee_id = p.id AND r.reviewee_role = 'professional' AND public.review_is_published(r)) AS r_count,
      (SELECT count(*) FROM public.jobs j WHERE j.assigned_provider_id = p.id AND j.status = 'afgerond') AS done,
      ARRAY(SELECT c.name FROM public.profile_categories pc JOIN public.categories c ON c.id = pc.category_id
            WHERE pc.profile_id = p.id ORDER BY c.sort_order LIMIT 3) AS cat_names
    FROM public.profiles p
    LEFT JOIN public.places pl ON pl.id = p.place_id
    WHERE p.is_provider AND p.status = 'actief' AND p.username IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.profile_categories pc WHERE pc.profile_id = p.id)
      AND (p_category IS NULL OR EXISTS (
        SELECT 1 FROM public.profile_categories pc
        WHERE pc.profile_id = p.id AND pc.category_id IN (SELECT public.category_and_children(p_category))))
      AND (p_mode IS NULL OR (p_mode = 'online' AND p.works_online) OR (p_mode = 'op_locatie' AND p.works_on_location))
      AND (p_max_rate_cents IS NULL OR p.hourly_rate_cents <= p_max_rate_cents)
      AND (p_available IS NULL OR NOT p_available OR p.availability <> 'niet_beschikbaar')
      AND (p_q IS NULL OR p_q = '' OR p.search_vector @@ websearch_to_tsquery('dutch', p_q))
      AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = p.id AND b.blocked_id = auth.uid())
  ),
  filtered AS (
    SELECT b.* FROM base b
    WHERE (p_min_rating IS NULL OR b.r_avg >= p_min_rating)
      AND (p_radius_km IS NULL OR p_place IS NULL OR (p_mode = 'online' AND b.works_online)
           OR (b.dist IS NOT NULL AND b.dist <= greatest(p_radius_km, 0)))
  )
  SELECT f.id, f.username, f.display_name, f.avatar_path, f.headline, f.place_name, round(f.dist)::int,
    f.works_online, f.works_on_location, f.hourly_rate_cents, f.provider_type, f.company_name,
    f.availability, f.kvk_verified_at IS NOT NULL, f.r_avg, f.r_count, f.done, f.cat_names,
    array_remove(ARRAY[
      CASE WHEN p_q IS NOT NULL AND p_q <> '' THEN 'Komt overeen met "' || left(p_q, 40) || '"' END,
      CASE WHEN f.dist IS NOT NULL AND f.dist <= f.travel_radius_km THEN 'Werkt in jouw regio' END,
      CASE WHEN f.availability = 'beschikbaar' THEN 'Nu beschikbaar' END,
      CASE WHEN f.r_count > 0 THEN f.r_count || ' gepubliceerde beoordeling(en)' END
    ], NULL),
    count(*) OVER ()
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort = 'relevant' AND p_q IS NOT NULL AND p_q <> '' THEN ts_rank(f.search_vector, websearch_to_tsquery('dutch', p_q)) END DESC NULLS LAST,
    CASE WHEN p_sort = 'relevant' THEN (CASE f.availability WHEN 'beschikbaar' THEN 0 WHEN 'beperkt' THEN 1 ELSE 2 END) END ASC,
    CASE WHEN p_sort = 'afstand' THEN f.dist END ASC NULLS LAST,
    CASE WHEN p_sort = 'tarief' THEN f.hourly_rate_cents END ASC NULLS LAST,
    CASE WHEN p_sort = 'beoordeling' THEN f.r_avg END DESC NULLS LAST,
    CASE WHEN p_sort IN ('relevant', 'afstand') THEN f.dist END ASC NULLS LAST,
    f.updated_at DESC, f.id
  LIMIT least(greatest(p_limit, 1), 50) OFFSET greatest(p_offset, 0);
$$;

-- ── Meldingen (reports) ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reports_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.reporter_id := auth.uid();
  NEW.status := 'open';
  NEW.resolution := NULL; NEW.handled_by := NULL; NEW.handled_at := NULL;
  PERFORM public.enforce_rate_limit('report',
    coalesce((public.setting('anti_spam') #>> '{reports_per_day}')::int, 10), interval '1 day');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reports_before_insert ON public.reports;
CREATE TRIGGER reports_before_insert BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.reports_before_insert();

-- ── Beheer (alleen moderators/admins) ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mod_handle_report(p_report uuid, p_status text, p_resolution text, p_action text DEFAULT 'geen')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.reports;
  v_owner uuid;
BEGIN
  IF NOT public.is_moderator() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  IF p_status NOT IN ('in_behandeling', 'afgehandeld', 'afgewezen') THEN RAISE EXCEPTION 'ongeldige_status'; END IF;
  IF p_status <> 'in_behandeling' AND char_length(trim(coalesce(p_resolution, ''))) < 5 THEN
    RAISE EXCEPTION 'motivering_verplicht';
  END IF;
  SELECT * INTO r FROM public.reports WHERE id = p_report FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'niet_gevonden'; END IF;

  IF p_action = 'verberg_inhoud' THEN
    CASE r.target_type
      WHEN 'opdracht' THEN
        UPDATE public.jobs SET moderation_status = 'afgewezen', moderation_reason = p_resolution WHERE id = r.target_id RETURNING client_id INTO v_owner;
      WHEN 'beoordeling' THEN
        UPDATE public.reviews SET moderation_status = 'verborgen', moderation_reason = p_resolution WHERE id = r.target_id RETURNING reviewer_id INTO v_owner;
      WHEN 'dienst' THEN
        UPDATE public.services SET status = 'verborgen' WHERE id = r.target_id RETURNING provider_id INTO v_owner;
      WHEN 'vraag' THEN
        UPDATE public.job_questions SET status = 'verborgen' WHERE id = r.target_id RETURNING asker_id INTO v_owner;
      WHEN 'bericht' THEN
        UPDATE public.messages SET body = '[verwijderd door moderatie]', attachment_path = NULL WHERE id = r.target_id RETURNING sender_id INTO v_owner;
      ELSE RAISE EXCEPTION 'actie_past_niet';
    END CASE;
  ELSIF p_action = 'schors_gebruiker' THEN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'alleen_admin'; END IF;
    v_owner := CASE r.target_type
      WHEN 'profiel' THEN r.target_id
      WHEN 'opdracht' THEN (SELECT client_id FROM public.jobs WHERE id = r.target_id)
      WHEN 'dienst' THEN (SELECT provider_id FROM public.services WHERE id = r.target_id)
      WHEN 'beoordeling' THEN (SELECT reviewer_id FROM public.reviews WHERE id = r.target_id)
      WHEN 'bericht' THEN (SELECT sender_id FROM public.messages WHERE id = r.target_id)
      WHEN 'vraag' THEN (SELECT asker_id FROM public.job_questions WHERE id = r.target_id)
    END;
    UPDATE public.profiles SET status = 'geschorst' WHERE id = v_owner;
  ELSIF p_action <> 'geen' THEN
    RAISE EXCEPTION 'onbekende_actie';
  END IF;

  UPDATE public.reports SET status = p_status, resolution = p_resolution, handled_by = auth.uid(), handled_at = now()
  WHERE id = p_report;
  PERFORM public.audit('melding_' || p_status, 'melding', p_report::text,
    jsonb_build_object('actie', p_action, 'doel', r.target_type, 'doel_id', r.target_id, 'motivering', p_resolution));

  -- DSA art. 16/17: melder en betrokkene krijgen een gemotiveerd besluit
  IF r.reporter_id IS NOT NULL AND p_status <> 'in_behandeling' THEN
    PERFORM public.notify(r.reporter_id, 'melding_besluit', 'Je melding is behandeld', p_resolution, '/account/meldingen-en-bezwaar');
  END IF;
  IF v_owner IS NOT NULL AND p_action <> 'geen' THEN
    PERFORM public.notify(v_owner, 'moderatie_besluit', 'Moderatiebesluit over jouw inhoud',
      p_resolution || ' Ben je het er niet mee eens? Je kunt bezwaar maken.', '/account/meldingen-en-bezwaar');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mod_review_job(p_job uuid, p_approve boolean, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  j public.jobs;
BEGIN
  IF NOT public.is_moderator() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'niet_gevonden'; END IF;
  IF NOT p_approve AND char_length(trim(coalesce(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'motivering_verplicht'; END IF;
  UPDATE public.jobs SET
    moderation_status = CASE WHEN p_approve THEN 'ok' ELSE 'afgewezen' END,
    moderation_reason = CASE WHEN p_approve THEN NULL ELSE p_reason END
  WHERE id = p_job;
  PERFORM public.audit(CASE WHEN p_approve THEN 'opdracht_goedgekeurd' ELSE 'opdracht_afgewezen' END, 'opdracht', p_job::text,
    jsonb_build_object('motivering', p_reason));
  PERFORM public.notify(j.client_id, 'moderatie_besluit',
    CASE WHEN p_approve THEN 'Je opdracht is gepubliceerd' ELSE 'Je opdracht is niet gepubliceerd' END,
    CASE WHEN p_approve THEN j.title ELSE coalesce(p_reason, '') || ' Je kunt bezwaar maken.' END,
    '/account/opdrachten/' || j.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.mod_resolve_dispute(p_job uuid, p_to text, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  j public.jobs;
BEGIN
  IF NOT public.is_moderator() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  IF p_to NOT IN ('afgerond', 'geannuleerd', 'bezig') THEN RAISE EXCEPTION 'ongeldige_status'; END IF;
  IF char_length(trim(coalesce(p_note, ''))) < 5 THEN RAISE EXCEPTION 'motivering_verplicht'; END IF;
  SELECT * INTO j FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF j.status <> 'geschil' THEN RAISE EXCEPTION 'geen_geschil'; END IF;
  UPDATE public.jobs SET status = p_to,
    completed_at = CASE WHEN p_to = 'afgerond' THEN now() ELSE completed_at END,
    closed_at = CASE WHEN p_to IN ('afgerond', 'geannuleerd') THEN now() ELSE closed_at END
  WHERE id = p_job;
  PERFORM public.log_job_status(p_job, 'geschil', p_to, p_note);
  PERFORM public.audit('geschil_afgesloten', 'opdracht', p_job::text, jsonb_build_object('naar', p_to, 'motivering', p_note));
  PERFORM public.notify(j.client_id, 'geschil', 'Geschil afgesloten door Jobmarkt', p_note, '/account/opdrachten/' || j.id);
  PERFORM public.notify(j.assigned_provider_id, 'geschil', 'Geschil afgesloten door Jobmarkt', p_note, '/account/opdrachten/' || j.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_role(p_user uuid, p_role text, p_grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  IF p_user = auth.uid() AND NOT p_grant AND p_role = 'admin' THEN RAISE EXCEPTION 'niet_jezelf'; END IF;
  IF p_grant THEN
    INSERT INTO public.user_roles (user_id, role, granted_by) VALUES (p_user, p_role, auth.uid()) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = p_user AND role = p_role;
  END IF;
  PERFORM public.audit(CASE WHEN p_grant THEN 'rol_toegekend' ELSE 'rol_ingetrokken' END, 'profiel', p_user::text,
    jsonb_build_object('rol', p_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user uuid, p_status text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  IF p_status NOT IN ('actief', 'geschorst') THEN RAISE EXCEPTION 'ongeldige_status'; END IF;
  IF char_length(trim(coalesce(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'motivering_verplicht'; END IF;
  UPDATE public.profiles SET status = p_status WHERE id = p_user;
  PERFORM public.audit('gebruiker_' || p_status, 'profiel', p_user::text, jsonb_build_object('motivering', p_reason));
  PERFORM public.notify(p_user, 'account', CASE WHEN p_status = 'geschorst' THEN 'Je account is geschorst' ELSE 'Je account is weer actief' END,
    p_reason, '/account/meldingen-en-bezwaar');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_setting(p_key text, p_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  UPDATE public.app_settings SET value = p_value, updated_at = now(), updated_by = auth.uid() WHERE key = p_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'onbekende_instelling'; END IF;
  PERFORM public.audit('instelling_gewijzigd', 'instelling', p_key, jsonb_build_object('waarde', p_value));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_verification(p_verification uuid, p_approve boolean, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v public.verifications;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'geen_toegang'; END IF;
  UPDATE public.verifications SET status = CASE WHEN p_approve THEN 'goedgekeurd' ELSE 'afgewezen' END,
    note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_verification AND status = 'ingediend'
  RETURNING * INTO v;
  IF v.id IS NULL THEN RAISE EXCEPTION 'niet_gevonden'; END IF;
  IF p_approve AND v.kind = 'kvk' THEN
    UPDATE public.profiles SET kvk_verified_at = now(), provider_type = 'zakelijk' WHERE id = v.profile_id;
  END IF;
  PERFORM public.audit('verificatie_' || CASE WHEN p_approve THEN 'goedgekeurd' ELSE 'afgewezen' END, 'profiel', v.profile_id::text,
    jsonb_build_object('soort', v.kind, 'notitie', p_note));
  PERFORM public.notify(v.profile_id, 'verificatie',
    CASE WHEN p_approve THEN 'KVK-gegevens gecontroleerd' ELSE 'KVK-controle niet gelukt' END, coalesce(p_note, ''), '/account/profiel');
END;
$$;

-- ── Account: export en verwijderen ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'exported_at', now(),
    'profile', (SELECT to_jsonb(p) - 'search_vector' FROM public.profiles p WHERE p.id = auth.uid()),
    'private', (SELECT to_jsonb(pp) - 'guardian_consent_token_hash' FROM public.profile_private pp WHERE pp.id = auth.uid()),
    'categories', (SELECT coalesce(jsonb_agg(c.name), '[]') FROM public.profile_categories pc JOIN public.categories c ON c.id = pc.category_id WHERE pc.profile_id = auth.uid()),
    'portfolio', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]') FROM public.portfolio_items x WHERE x.profile_id = auth.uid()),
    'services', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]') FROM public.services x WHERE x.provider_id = auth.uid()),
    'jobs', (SELECT coalesce(jsonb_agg(to_jsonb(x) - 'search_vector'), '[]') FROM public.jobs x WHERE x.client_id = auth.uid()),
    'proposals', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]') FROM public.proposals x WHERE x.provider_id = auth.uid()),
    'questions', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]') FROM public.job_questions x WHERE x.asker_id = auth.uid()),
    'messages_sent', (SELECT coalesce(jsonb_agg(jsonb_build_object('conversation', x.conversation_id, 'body', x.body, 'at', x.created_at)), '[]') FROM public.messages x WHERE x.sender_id = auth.uid()),
    'contact_shares', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]') FROM public.contact_shares x WHERE x.user_id = auth.uid()),
    'reviews_written', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]') FROM public.reviews x WHERE x.reviewer_id = auth.uid()),
    'favorites', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]') FROM public.favorites x WHERE x.user_id = auth.uid()),
    'saved_searches', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]') FROM public.saved_searches x WHERE x.user_id = auth.uid()),
    'reports', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]') FROM public.reports x WHERE x.reporter_id = auth.uid()),
    'subscription', (SELECT to_jsonb(x) FROM public.subscriptions x WHERE x.user_id = auth.uid())
  );
$$;

-- Verwijderen kan niet midden in een lopende opdracht; daarna verwijdert de
-- server het Auth-account (service role), wat alles via CASCADE opruimt.
CREATE OR REPLACE FUNCTION public.can_delete_account()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.jobs
      WHERE (client_id = auth.uid() OR assigned_provider_id = auth.uid())
        AND status IN ('toegewezen', 'bezig', 'opgeleverd', 'geschil')
    ) THEN 'lopende_opdracht'
    WHEN public.has_paid_pro(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.subscriptions WHERE user_id = auth.uid() AND NOT cancel_at_period_end
    ) THEN 'abonnement_actief'
    ELSE 'ok'
  END;
$$;
