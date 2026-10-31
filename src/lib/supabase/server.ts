import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Supabase als de ingelogde gebruiker (RLS geldt). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(url(), anonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // aangeroepen vanuit een Server Component: de proxy ververst de sessie
        }
      },
    },
  });
}

/** Anonieme client zonder cookies, voor openbare pagina's (alleen openbare data). */
export function createPublicClient() {
  return createPlainClient(url(), anonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
