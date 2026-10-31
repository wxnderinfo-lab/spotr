import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingEnabled, getStripe } from "@/lib/billing";
import { site } from "@/config/site";

// Stripe-klantportaal: opzeggen, betaalmethode en facturen. Opzeggen kan
// daar in een paar klikken, zonder belletje of verborgen route.
export async function POST(request: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/account/abonnement${q}`, request.url), 303);
  if (!billingEnabled()) return back("?fout=niet_actief");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/inloggen", request.url), 303);
  const { data } = await createAdminClient().from("billing_customers").select("provider_customer_id").eq("user_id", user.id).maybeSingle();
  if (!data) return back("?fout=geen_klant");
  const session = await getStripe().billingPortal.sessions.create({ customer: data.provider_customer_id, return_url: `${site.url}/account/abonnement`, locale: "nl" });
  return NextResponse.redirect(session.url, 303);
}
