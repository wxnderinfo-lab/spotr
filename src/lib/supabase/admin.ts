import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Alleen voor server-code die RLS bewust omzeilt:
 * de Stripe-webhook, account verwijderen en de dagelijkse taak. Nooit in
 * browsercode importeren ("server-only" bewaakt dat bij de build).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
