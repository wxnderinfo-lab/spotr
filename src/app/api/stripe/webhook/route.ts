import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, periodEnd } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe-webhook. Veiligheid:
// 1. Handtekening controleren op de ruwe body (STRIPE_WEBHOOK_SECRET).
// 2. Idempotent: elk event-id wordt één keer verwerkt (webhook_events).
// 3. Abonnementsrechten komen alleen hier vandaan, nooit uit de browser.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: dup } = await admin.from("webhook_events").insert({ id: event.id, provider: "stripe", type: event.type });
  if (dup) {
    if (dup.code === "23505" || dup.message.includes("duplicate")) return NextResponse.json({ received: true, duplicate: true });
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  try {
    await handle(event, admin);
    await admin.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
    return NextResponse.json({ received: true });
  } catch (e) {
    // registratie terugdraaien zodat Stripe het event opnieuw mag aanbieden
    await admin.from("webhook_events").delete().eq("id", event.id);
    console.error("stripe webhook", event.type, (e as Error).message);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}

async function userForCustomer(admin: ReturnType<typeof createAdminClient>, customer: string, fallback?: string | null) {
  if (fallback) return fallback;
  const { data } = await admin.from("billing_customers").select("user_id").eq("provider_customer_id", customer).maybeSingle();
  return data?.user_id ?? null;
}

async function handle(event: Stripe.Event, admin: ReturnType<typeof createAdminClient>) {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id ?? s.metadata?.user_id ?? null;
      if (userId && typeof s.customer === "string") {
        const { error } = await admin.from("billing_customers").upsert({ user_id: userId, provider_customer_id: s.customer }, { onConflict: "user_id" });
        if (error) throw new Error(error.message);
      }
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const userId = await userForCustomer(admin, customer, sub.metadata?.user_id);
      if (!userId) throw new Error("onbekende klant");
      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          plan: "pro",
          status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          current_period_end: periodEnd(sub),
          cancel_at_period_end: sub.cancel_at_period_end,
          provider: "stripe",
          provider_customer_id: customer,
          provider_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw new Error(error.message);
      return;
    }
    default:
      return; // andere events negeren we bewust
  }
}
