import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getStripe } from "./config";
import { toDateTime } from "./helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Product/Price types for webhook upserts
interface ProductRecord {
  id: string;
  active: boolean;
  name: string;
  description: string | null;
  image: string | null;
  metadata: Record<string, unknown> | null;
}

interface PriceRecord {
  id: string;
  product_id: string;
  active: boolean;
  currency: string;
  type: "one_time" | "recurring";
  unit_amount: number | null;
  interval: "day" | "week" | "month" | "year" | null;
  interval_count: number | null;
  trial_period_days: number | null;
}

interface SubscriptionRecord {
  id: string;
  user_id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  price_id: string;
  quantity: number;
  cancel_at_period_end: boolean;
  created: string;
  current_period_start: string;
  current_period_end: string;
  ended_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
}

export const upsertProductRecord = async (product: Stripe.Product) => {
  const data: ProductRecord = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    image: product.images?.[0] ?? null,
    metadata: product.metadata as Record<string, unknown> | null,
  };
  const { error } = await supabaseAdmin.from("products").upsert([data]);
  if (error) throw new Error(`Product upsert failed: ${error.message}`);
};

export const upsertPriceRecord = async (
  price: Stripe.Price,
  retryCount = 0,
  maxRetries = 3
): Promise<void> => {
  const data: PriceRecord = {
    id: price.id,
    product_id: typeof price.product === "string" ? price.product : price.product.id,
    active: price.active,
    currency: price.currency,
    type: price.type as "one_time" | "recurring",
    unit_amount: price.unit_amount ?? null,
    interval: (price.recurring?.interval as "day" | "week" | "month" | "year") ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? null,
  };
  const { error } = await supabaseAdmin.from("prices").upsert([data]);
  if (error?.message?.includes("foreign key")) {
    if (retryCount < maxRetries) {
      await new Promise((r) => setTimeout(r, 2000));
      return upsertPriceRecord(price, retryCount + 1, maxRetries);
    }
    throw new Error(`Price upsert failed after ${maxRetries} retries: ${error.message}`);
  }
  if (error) throw new Error(`Price upsert failed: ${error.message}`);
};

export const deleteProductRecord = async (product: Stripe.Product) => {
  const { error } = await supabaseAdmin.from("products").delete().eq("id", product.id);
  if (error) throw new Error(`Product delete failed: ${error.message}`);
};

export const deletePriceRecord = async (price: Stripe.Price) => {
  const { error } = await supabaseAdmin.from("prices").delete().eq("id", price.id);
  if (error) throw new Error(`Price delete failed: ${error.message}`);
};

export const createOrRetrieveCustomer = async (uuid: string, email: string) => {
  const { data: existing, error: queryError } = await supabaseAdmin
    .from("customers")
    .select("stripe_customer_id")
    .eq("id", uuid)
    .maybeSingle();

  if (queryError) throw new Error(`Customer lookup failed: ${queryError.message}`);

  let stripeCustomerId: string | undefined;

  // Verify any stored customer still exists in the CURRENT Stripe account.
  // (After switching Stripe accounts, old IDs will 404 - fall back to create.)
  if (existing?.stripe_customer_id) {
    try {
      const cust = await getStripe().customers.retrieve(existing.stripe_customer_id);
      const isDeleted = (cust as Stripe.DeletedCustomer).deleted === true;
      if (!isDeleted) {
        stripeCustomerId = cust.id;
      }
    } catch {
      stripeCustomerId = undefined;
    }
  }

  if (!stripeCustomerId) {
    const list = await getStripe().customers.list({ email });
    stripeCustomerId = list.data[0]?.id;
  }

  if (!stripeCustomerId) {
    const newCustomer = await getStripe().customers.create({
      email,
      metadata: { supabaseUUID: uuid },
    });
    stripeCustomerId = newCustomer.id;
  }

  const { error: upsertError } = await supabaseAdmin.from("customers").upsert(
    [{ id: uuid, stripe_customer_id: stripeCustomerId }],
    { onConflict: "id" }
  );
  if (upsertError) throw new Error(`Customer upsert failed: ${upsertError.message}`);

  return stripeCustomerId;
};

export const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string,
  createAction = false
) => {
  const { data: customerData, error: custError } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  if (custError || !customerData) throw new Error("Customer lookup failed");

  const sub = await getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"],
  });
  const firstItem = sub.items.data[0];
  const priceId = typeof firstItem?.price === "string" ? firstItem.price : firstItem?.price?.id;
  if (!priceId || !firstItem) throw new Error("No price on subscription");

  // Ensure price (and product) exist before subscription upsert - they may not have been synced yet
  // (e.g. created in Stripe Dashboard before webhook, or subscription event arrived before price event)
  const priceObj = await getStripe().prices.retrieve(priceId, { expand: ["product"] });
  const productId = typeof priceObj.product === "string" ? priceObj.product : priceObj.product?.id;
  if (productId) {
    const productObj =
      typeof priceObj.product === "object" ? priceObj.product : await getStripe().products.retrieve(productId);
    await upsertProductRecord(productObj as Stripe.Product);
  }
  await upsertPriceRecord(priceObj);

  const data: SubscriptionRecord = {
    id: sub.id,
    user_id: customerData.id,
    status: sub.status,
    metadata: sub.metadata as Record<string, unknown> | null,
    price_id: priceId,
    quantity: firstItem.quantity ?? 1,
    cancel_at_period_end: sub.cancel_at_period_end,
    created: toDateTime(sub.created).toISOString(),
    current_period_start: toDateTime(firstItem.current_period_start).toISOString(),
    current_period_end: toDateTime(firstItem.current_period_end).toISOString(),
    ended_at: sub.ended_at ? toDateTime(sub.ended_at).toISOString() : null,
    cancel_at: sub.cancel_at ? toDateTime(sub.cancel_at).toISOString() : null,
    canceled_at: sub.canceled_at ? toDateTime(sub.canceled_at).toISOString() : null,
    trial_start: sub.trial_start ? toDateTime(sub.trial_start).toISOString() : null,
    trial_end: sub.trial_end ? toDateTime(sub.trial_end).toISOString() : null,
  };

  const { error } = await supabaseAdmin.from("subscriptions").upsert([data], {
    onConflict: "id",
  });
  if (error) throw new Error(`Subscription upsert failed: ${error.message}`);
};

const EXAM_DATE = new Date("2026-10-01");

export const upsertOneTimePurchase = async (
  session: Stripe.Checkout.Session,
  accessUntil: Date = EXAM_DATE
) => {
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) return;

  const { data: customerData, error: custError } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  if (custError || !customerData) return;

  // Prefer payment intent for dedupe; fall back to session id in metadata
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (paymentIntentId) {
    const { data: existingByPi } = await supabaseAdmin
      .from("one_time_purchases")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    if (existingByPi) return;
  }

  const amount =
    session.amount_total ??
    session.line_items?.data?.[0]?.amount_total ??
    0;
  const currency = (session.currency ?? "gbp").toLowerCase();

  // Dynamic Checkout price_data IDs are not synced into our prices/products
  // tables - leave FKs null and store details in metadata instead.
  const { error } = await supabaseAdmin.from("one_time_purchases").insert({
    user_id: customerData.id,
    stripe_payment_intent_id: paymentIntentId,
    price_id: null,
    product_id: null,
    amount_paid: amount,
    currency,
    access_until: accessUntil.toISOString().slice(0, 10),
    metadata: {
      ...(session.metadata as Record<string, unknown> | null),
      checkoutSessionId: session.id,
      planType: session.metadata?.planType ?? "season_pass",
    },
  });
  if (error) throw new Error(`One-time purchase insert failed: ${error.message}`);
};

/**
 * After a season-pass trial converts to paid, record exam-dated access and
 * stop the yearly subscription from renewing.
 */
export const finalizeSeasonPassSubscription = async (
  subscription: Stripe.Subscription
) => {
  if (subscription.metadata?.planType !== "season_pass") return;
  if (subscription.status !== "active") return;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return;

  const { data: customerData, error: custError } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  if (custError || !customerData) return;

  const accessUntilRaw = subscription.metadata?.access_until;
  const accessUntil =
    typeof accessUntilRaw === "string" && accessUntilRaw.length > 0
      ? accessUntilRaw
      : EXAM_DATE.toISOString().slice(0, 10);

  const firstItem = subscription.items.data[0];
  const price = firstItem?.price;
  const priceId = typeof price === "string" ? price : price?.id ?? null;
  const productId =
    price && typeof price !== "string"
      ? typeof price.product === "string"
        ? price.product
        : price.product?.id ?? null
      : null;
  const amountPaid =
    price && typeof price !== "string" ? price.unit_amount ?? 0 : 0;
  const currency =
    price && typeof price !== "string"
      ? (price.currency ?? "gbp").toLowerCase()
      : "gbp";

  const { data: existingPurchases } = await supabaseAdmin
    .from("one_time_purchases")
    .select("id, metadata")
    .eq("user_id", customerData.id);

  const alreadyRecorded = (existingPurchases ?? []).some((row) => {
    const meta = row.metadata as Record<string, unknown> | null;
    return meta?.subscriptionId === subscription.id;
  });

  if (!alreadyRecorded) {
    await supabaseAdmin.from("one_time_purchases").insert({
      user_id: customerData.id,
      stripe_payment_intent_id: null,
      price_id: priceId,
      product_id: productId,
      amount_paid: amountPaid,
      currency,
      access_until: accessUntil,
      metadata: {
        ...subscription.metadata,
        subscriptionId: subscription.id,
        source: "season_pass_trial_conversion",
      },
    });
  }

  if (!subscription.cancel_at_period_end) {
    await getStripe().subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });
  }
};
