/**
 * One-off: deactivate existing CAMP50 Stripe promotion codes so they cannot
 * be typed into Checkout. Friend discounts now apply via the shared coupon
 * after server-side validation only.
 *
 * Usage: npx tsx scripts/deactivate-referral-promos.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { deactivateReferralPromotionCodes } from "../src/lib/feedbackReferral/stripe";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env.production"));

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env for referral code lookup");
  }
  if (!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY_LIVE) {
    throw new Error("Missing Stripe secret key");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("feedback_referral_codes")
    .select("code, stripe_promotion_code_id");
  if (error) throw error;

  const ids = (data ?? [])
    .map((row) => row.stripe_promotion_code_id as string)
    .filter(Boolean);

  console.log(`Deactivating ${ids.length} referral promotion code(s)…`);
  const result = await deactivateReferralPromotionCodes(ids);
  console.log("deactivated:", result.deactivated);
  if (result.failed.length) {
    console.error("failed:", result.failed);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
