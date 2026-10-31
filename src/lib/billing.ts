import "server-only";
import Stripe from "stripe";

/**
 * Betalen loopt via Stripe, eerst alleen in testmodus. Zonder
 * BILLING_ENABLED=true en geldige sleutels toont de site geen afrekenknop.
 * Jobmarkt verwerkt alleen het abonnementsgeld, nooit opdrachtgeld.
 */
export const billingEnabled = () =>
  process.env.BILLING_ENABLED === "true" && !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_PRO_MONTHLY;

export const isTestMode = () => (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");

let stripe: Stripe | null = null;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY ontbreekt");
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "Jobmarkt" } });
  return stripe;
}

/** Periode-einde: nieuwere API-versies zetten dit op het abonnementsitem. */
export function periodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const ts = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}
