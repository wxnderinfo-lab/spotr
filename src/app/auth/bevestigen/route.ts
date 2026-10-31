import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

// Link uit de Supabase-mails (bevestigen, wachtwoordherstel). De e-mailtemplates
// in supabase/templates verwijzen hierheen met token_hash en type.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  let next = url.searchParams.get("next") ?? "";
  try {
    if (next.startsWith("http")) next = new URL(next).pathname + new URL(next).search;
  } catch {
    next = "";
  }
  const target = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  if (!tokenHash || !type) return target("/inloggen?fout=link");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return target("/inloggen?fout=verlopen");
  if (type === "recovery") return target("/wachtwoord-instellen");
  return target(safeNext(next, "/welkom"));
}
