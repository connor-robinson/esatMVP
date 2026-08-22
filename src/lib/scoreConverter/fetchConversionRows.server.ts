import type { createServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

export type ConversionRowRecord = {
  table_id: number;
  part_name: string;
  raw_score: number;
  scaled_score: number;
};

type SupabaseClient = ReturnType<typeof createServerClient>;

/** Supabase caps select results at 1000 rows; paginate for full tables. */
export async function fetchConversionRowsForTables(
  supabase: SupabaseClient,
  tableIds: number[],
  select = "table_id, part_name, raw_score, scaled_score",
): Promise<ConversionRowRecord[]> {
  if (tableIds.length === 0) return [];

  const all: ConversionRowRecord[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("conversion_rows")
      .select(select)
      .in("table_id", tableIds)
      .order("table_id")
      .order("part_name")
      .order("raw_score")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []) as ConversionRowRecord[];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}
