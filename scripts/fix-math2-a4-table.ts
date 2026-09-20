import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

for (const line of fs
  .readFileSync(path.resolve(".env.local"), "utf8")
  .split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i <= 0) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!(k in process.env)) process.env[k] = v;
}

const stem = `The table gives values of a function $f$.

$$
\\begin{array}{c|cccc}
x & 0 & 1 & 2 & 3 \\\\
\\hline
f(x) & 2 & 3 & 6 & 11
\\end{array}
$$

It is also known that $f''(x)>0$ for $0<x<3$. The trapezium rule with these four ordinates is used to estimate $$\\int_0^3 f(x)\\,dx.$$ Which statement is correct?`;

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await s
    .from("ai_generated_questions")
    .update({ question_stem: stem, updated_at: new Date().toISOString() })
    .eq("id", "4343cd5e-2f45-43ca-a778-e8cfd1d516af");
  if (error) throw new Error(error.message);
  console.log("A4 stem updated to LaTeX array");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
