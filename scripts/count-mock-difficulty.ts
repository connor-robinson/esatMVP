import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  for (const sub of ["Math 1", "Math 2", "Physics", "Chemistry", "Biology"]) {
    const a = await s
      .from("ai_generated_questions")
      .select("id", { count: "exact", head: true })
      .eq("subjects", sub)
      .in("status", ["approved", "pending"])
      .eq("mock_eligible", true)
      .is("mock_difficulty", null);
    const b = await s
      .from("ai_generated_questions")
      .select("id", { count: "exact", head: true })
      .eq("subjects", sub)
      .in("status", ["approved", "pending"])
      .eq("mock_eligible", true)
      .not("mock_difficulty", "is", null);
    console.log(`${sub}: unlabeled=${a.count} labeled=${b.count}`);
  }
}

main();
