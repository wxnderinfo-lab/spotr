-- Alleen voor de lokale testgateway (server.mjs). Deze functies bestaan
-- nooit in een echt project: ze laten de nagebootste Auth en Storage via
-- PostgREST schrijven, zodat alle databasetoegang over één verbinding loopt.

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON auth.users TO service_role;

CREATE OR REPLACE FUNCTION public._local_auth_create_user(p_email text, p_password text, p_meta jsonb, p_confirmed boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
  VALUES (lower(p_email), p_password, coalesce(p_meta, '{}'), CASE WHEN p_confirmed THEN now() END)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public._local_auth_users()
RETURNS SETOF auth.users LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT * FROM auth.users;
$$;

CREATE OR REPLACE FUNCTION public._local_auth_update(p_id uuid, p_password text, p_confirm boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE auth.users SET
    encrypted_password = coalesce(p_password, encrypted_password),
    email_confirmed_at = CASE WHEN p_confirm THEN coalesce(email_confirmed_at, now()) ELSE email_confirmed_at END,
    updated_at = now()
  WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._local_auth_delete(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  DELETE FROM auth.users WHERE id = p_id;
$$;

-- Draait met de rechten van de aanroeper: storage-RLS geldt dus echt.
CREATE OR REPLACE FUNCTION public._local_storage_insert(p_bucket text, p_name text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES (p_bucket, p_name, auth.uid());
$$;
CREATE OR REPLACE FUNCTION public._local_storage_can_read(p_bucket text, p_name text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = p_bucket AND name = p_name);
$$;
CREATE OR REPLACE FUNCTION public._local_storage_delete(p_bucket text, p_name text)
RETURNS int LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  WITH d AS (DELETE FROM storage.objects WHERE bucket_id = p_bucket AND name = p_name RETURNING 1) SELECT count(*)::int FROM d;
$$;
CREATE OR REPLACE FUNCTION public._local_storage_bucket(p_bucket text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT to_jsonb(b) FROM storage.buckets b WHERE id = p_bucket;
$$;

REVOKE EXECUTE ON FUNCTION public._local_auth_create_user(text, text, jsonb, boolean), public._local_auth_users(),
  public._local_auth_update(uuid, text, boolean), public._local_auth_delete(uuid), public._local_storage_bucket(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._local_auth_create_user(text, text, jsonb, boolean), public._local_auth_users(),
  public._local_auth_update(uuid, text, boolean), public._local_auth_delete(uuid), public._local_storage_bucket(text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public._local_storage_insert(text, text), public._local_storage_can_read(text, text),
  public._local_storage_delete(text, text) TO authenticated, anon, service_role;
