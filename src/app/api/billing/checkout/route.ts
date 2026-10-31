import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingEnabled, getStripe } from "@/lib/billing";
import { site } from "@/config/site";

// Start een Stripe Checkout voor Pro. Alleen volwassenen met een bevestigd
// e-mailadres; minderjarigen krijgen geen betaalde functies.
export async function POST(request: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/account/abonnement${q}`, request.url), 303);
  if (!billingEnabled()) return back("?fout=niet_actief");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/inloggen?volgende=/account/abonnement", request.url), 303);
  const { data: status } = await supabase.rpc("my_account_status");
  if (!status || status.is_minor) return back("?fout=minderjarig");
  if (status.has_paid_pro) return back("?fout=al_pro");

  const admin = createAdminClient();
  const stripe = getStripe();
  const { data: existing } = await admin.from("billing_customers").select("provider_customer_id").eq("user_id", user.id).maybeSingle();
  let customer = existing?.provider_customer_id;
  if (!customer) {
    const c = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } }, { idempotencyKey: `customer-${user.id}` });
    customer = c.id;
    await admin.from("billing_customers").upsert({ user_id: user.id, provider_customer_id: customer }, { onConflict: "user_id" });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_PRO_MONTHLY!, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    metadata: { user_id: user.id },
    locale: "nl",
    allow_promotion_codes: false,
    success_url: `${site.url}/account/abonnement?gelukt=1`,
    cancel_url: `${site.url}/account/abonnement?geannuleerd=1`,
  });
  return NextResponse.redirect(session.url!, 303);
}
