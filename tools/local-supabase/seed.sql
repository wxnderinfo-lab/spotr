-- Alleen lokaal: één beheeraccount om de beheeromgeving te testen.
-- Geen openbare inhoud: opdrachten, profielen en beoordelingen maken de
-- end-to-end-tests zelf aan via de echte schermen.
-- Inloggen: beheer@jobmarkt.test / Beheer-lokaal-2026 (alleen deze testgateway)

DO $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES ('beheer@jobmarkt.test', 'local$' || encode(sha256(convert_to('Beheer-lokaal-2026', 'UTF8')), 'hex'), now(), '{"display_name":"Beheer"}')
  RETURNING id INTO v_id;
  UPDATE public.profile_private SET birthdate = DATE '1990-01-01', accepted_terms_version = 'lokaal', accepted_terms_at = now() WHERE id = v_id;
  UPDATE public.profiles SET username = 'beheer', display_name = 'Beheer' WHERE id = v_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_id, 'admin');
END $$;
