-- Jobmarkt: diensten met omslagfoto en maximaal drie pakketten (Basis, Plus,
-- Compleet). Alleen toevoegingen; bestaande diensten zonder pakketten blijven
-- werken met hun ene prijs.

-- Pakketten: [{name, price_cents, description, delivery}], 0 tot 3 stuks.
CREATE OR REPLACE FUNCTION public.valid_service_packages(p jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(p) = 'array'
    AND jsonb_array_length(p) <= 3
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p) e
      WHERE jsonb_typeof(e) <> 'object'
        OR char_length(coalesce(e->>'name', '')) NOT BETWEEN 2 AND 40
        OR jsonb_typeof(e->'price_cents') <> 'number'
        OR (e->>'price_cents')::numeric NOT BETWEEN 100 AND 10000000
        OR (e->>'price_cents')::numeric <> trunc((e->>'price_cents')::numeric)
        OR char_length(coalesce(e->>'description', '')) > 300
        OR char_length(coalesce(e->>'delivery', '')) > 60
        OR (SELECT count(*) FROM jsonb_object_keys(e) k WHERE k NOT IN ('name', 'price_cents', 'description', 'delivery')) > 0
    );
$$;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS cover_path text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS packages jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_packages_valid') THEN
    ALTER TABLE public.services ADD CONSTRAINT services_packages_valid CHECK (public.valid_service_packages(packages));
  END IF;
  -- omslagfoto alleen uit de eigen map in de portfolio-bucket
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_cover_own_folder') THEN
    ALTER TABLE public.services ADD CONSTRAINT services_cover_own_folder
      CHECK (cover_path IS NULL OR (split_part(cover_path, '/', 1) = provider_id::text AND cover_path !~ '\.\.'));
  END IF;
END $$;

GRANT INSERT (cover_path, packages), UPDATE (cover_path, packages) ON public.services TO authenticated;
-- de CHECK draait met de rol van de schrijver
GRANT EXECUTE ON FUNCTION public.valid_service_packages(jsonb) TO authenticated, service_role;
