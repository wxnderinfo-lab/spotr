-- Jobmarkt: live functies in de chat en meldingen.
-- Leesbevestiging, 'laatst actief', typen en aanwezigheid (via privé
-- Realtime-kanalen) en live tellers. Alleen toevoegingen, niets verwijderd.

-- ── Laatst actief ──────────────────────────────────────────────────────────
-- Staat in profile_private (geen kolomrechten voor gebruikers) en is alleen
-- via conversation_peer() zichtbaar voor een gesprekspartner.
ALTER TABLE public.profile_private ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  -- hooguit één schrijfactie per halve minuut per gebruiker
  UPDATE public.profile_private SET last_seen_at = now()
  WHERE id = auth.uid() AND (last_seen_at IS NULL OR last_seen_at < now() - interval '30 seconds');
$$;

-- Status van de ander in een gesprek: laatst actief en tot wanneer gelezen.
CREATE OR REPLACE FUNCTION public.conversation_peer(p_conversation uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c public.conversations;
  v_uid uuid := auth.uid();
  v_peer uuid;
  v_blocked boolean;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE id = p_conversation;
  IF c.id IS NULL OR v_uid IS NULL OR v_uid NOT IN (c.client_id, c.provider_id) THEN
    RAISE EXCEPTION 'geen_toegang';
  END IF;
  v_peer := CASE WHEN c.client_id = v_uid THEN c.provider_id ELSE c.client_id END;
  v_blocked := public.is_blocked_between(v_uid, v_peer);
  RETURN jsonb_build_object(
    'last_seen_at', CASE WHEN v_blocked THEN NULL
      ELSE (SELECT last_seen_at FROM public.profile_private WHERE id = v_peer) END,
    'last_read_at', (SELECT last_read_at FROM public.conversation_reads
      WHERE conversation_id = c.id AND user_id = v_peer)
  );
END;
$$;

-- Leesbevestiging: deelnemers zien ook tot wanneer de ander gelezen heeft.
DROP POLICY IF EXISTS "conversation_reads: eigen" ON public.conversation_reads;
DROP POLICY IF EXISTS "conversation_reads: deelnemers" ON public.conversation_reads;
CREATE POLICY "conversation_reads: deelnemers" ON public.conversation_reads FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));

-- ── Live tellers ───────────────────────────────────────────────────────────
-- Lichte variant van my_account_status() voor de bel en berichten-teller.
CREATE OR REPLACE FUNCTION public.my_live_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'notifications', (SELECT count(*) FROM public.notifications n WHERE n.user_id = auth.uid() AND n.read_at IS NULL),
    'messages', (
      SELECT count(*) FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      LEFT JOIN public.conversation_reads r ON r.conversation_id = c.id AND r.user_id = auth.uid()
      WHERE (c.client_id = auth.uid() OR c.provider_id = auth.uid())
        AND m.sender_id IS DISTINCT FROM auth.uid()
        AND m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    )
  )
  WHERE auth.uid() IS NOT NULL;
$$;

-- ── Privé Realtime-kanalen (typen en aanwezigheid) ─────────────────────────
-- Kanaal 'gesprek:<id>' is alleen voor de twee deelnemers, en niet als een
-- van beiden de ander heeft geblokkeerd.
CREATE OR REPLACE FUNCTION public.can_use_realtime_topic(p_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c public.conversations;
BEGIN
  IF p_topic IS NULL OR p_topic NOT LIKE 'gesprek:%' THEN RETURN false; END IF;
  SELECT * INTO c FROM public.conversations WHERE id = substr(p_topic, 9)::uuid;
  RETURN c.id IS NOT NULL
    AND auth.uid() IN (c.client_id, c.provider_id)
    AND NOT public.is_blocked_between(c.client_id, c.provider_id);
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$$;

DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "jobmarkt: gesprekskanaal ontvangen" ON realtime.messages;
    CREATE POLICY "jobmarkt: gesprekskanaal ontvangen" ON realtime.messages FOR SELECT TO authenticated
      USING (realtime.messages.extension IN ('broadcast', 'presence')
        AND public.can_use_realtime_topic((SELECT realtime.topic())));
    DROP POLICY IF EXISTS "jobmarkt: gesprekskanaal sturen" ON realtime.messages;
    CREATE POLICY "jobmarkt: gesprekskanaal sturen" ON realtime.messages FOR INSERT TO authenticated
      WITH CHECK (realtime.messages.extension IN ('broadcast', 'presence')
        AND public.can_use_realtime_topic((SELECT realtime.topic())));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_reads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_reads;
  END IF;
END $$;

-- ── Rechten ────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.touch_last_seen(), public.conversation_peer(uuid),
  public.my_live_counts(), public.can_use_realtime_topic(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_seen(), public.conversation_peer(uuid),
  public.my_live_counts(), public.can_use_realtime_topic(text) TO authenticated;
