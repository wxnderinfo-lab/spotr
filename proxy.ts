import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Ververst de Supabase-sessie (cookies) bij elk verzoek. Autorisatie zelf
// gebeurt op de pagina's en in de database (RLS), niet hier.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Alleen als er een sessiecookie is: anonieme bezoekers krijgen geen extra Auth-verzoek.
  if (request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    await supabase.auth.getUser();
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|api/stripe|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2)$).*)"],
};
