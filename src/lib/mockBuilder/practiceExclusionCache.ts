/**
 * Cached read of "exclude published mock questions from practice".
 * Used by question-bank list endpoints.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EXCLUDE_SETTING_KEY,
  parseExcludeSetting,
} from "@/lib/mockBuilder/exclusivity";

let cached: { value: boolean; at: number } | null = null;
const TTL_MS = 60_000;

export async function shouldExcludeReservedMockQuestions(
  supabase: SupabaseClient,
): Promise<boolean> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;

  try {
    const { data, error } = await supabase
      .from("esat_mock_settings")
      .select("value")
      .eq("key", EXCLUDE_SETTING_KEY)
      .maybeSingle();

    if (error) {
      // Migration not applied yet: do not break practice.
      cached = { value: false, at: now };
      return false;
    }

    const value = data ? parseExcludeSetting(data.value) : true;
    cached = { value, at: now };
    return value;
  } catch {
    cached = { value: false, at: now };
    return false;
  }
}

/** Test helper. */
export function clearPracticeExclusionCache(): void {
  cached = null;
}
