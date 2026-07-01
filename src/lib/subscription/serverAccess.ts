import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function userHasFullAccess(userId: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("current_period_end", { ascending: false })
    .limit(1);

  const activeSub = subs?.[0];
  if (activeSub) {
    const periodEnd = new Date(activeSub.current_period_end);
    if (periodEnd > new Date()) return true;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: purchases } = await supabase
    .from("one_time_purchases")
    .select("access_until")
    .eq("user_id", userId)
    .gte("access_until", today)
    .order("created_at", { ascending: false })
    .limit(1);

  const validPurchase = purchases?.[0];
  if (validPurchase) {
    const accessUntil = new Date(validPurchase.access_until + "T23:59:59");
    if (accessUntil >= new Date()) return true;
  }

  return false;
}
