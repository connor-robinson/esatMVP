import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { MOCK_BUILDER_SUBJECTS } from "../src/lib/mockBuilder/types";
import { isFreeTierHookQuestion } from "../src/lib/mockBuilder/poolFilters";

const p = path.resolve(".env.local");
for (const line of fs.readFileSync(p, "utf8").split(/\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i <= 0) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim();
  if (!(k in process.env)) process.env[k] = v;
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  let total = 0;
  let hooks = 0;
  for (const subject of MOCK_BUILDER_SUBJECTS) {
    const { data, error } = await s
      .from("ai_generated_questions")
      .select("id, generation_id, status, mock_eligible, practice_eligible")
      .eq("subjects", subject)
      .in("status", ["approved", "pending"])
      .eq("mock_eligible", true)
      .is("mock_difficulty", null);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const hookRows = rows.filter((r) =>
      isFreeTierHookQuestion({
        id: r.id,
        generationId: r.generation_id,
      }),
    );
    total += rows.length;
    hooks += hookRows.length;
    console.log(
      `${subject}: unlabeled=${rows.length} (free-tier hooks=${hookRows.length}, labelable=${rows.length - hookRows.length})`,
    );
  }
  console.log(
    `TOTAL unlabeled=${total} hooks=${hooks} labelable=${total - hooks}`,
  );
}

main();
