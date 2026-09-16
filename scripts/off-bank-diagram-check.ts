/**
 * Off-bank diagram backlog by subject (missing-diagram guard).
 *   npx tsx scripts/off-bank-diagram-check.ts
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  missingDiagramApprovalBlock,
  questionHasDiagramAsset,
} from "../src/lib/questionBank/missingDiagramGuard";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
}

loadEnvFile(path.resolve(".env.local"));

type Row = {
  id: string;
  subjects: string | null;
  status: string | null;
  practice_eligible: boolean | null;
  question_stem: string | null;
  has_visual: boolean | null;
  visual_type: string | null;
  quality_gate_graph_mode: string | null;
  quality_gate_graph_candidate: boolean | null;
  quality_gate_diagram_backfill_kind: string | null;
  answer_depends_on_visual: boolean | null;
  graphs: unknown;
  svg_operator_backfill_choice: string | null;
};

function isOffBank(row: Row): boolean {
  if (row.status === "pending") return true;
  if (row.status === "approved" && row.practice_eligible === false) return true;
  return false;
}

async function main() {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const pageSize = 500;
  let from = 0;
  const rows: Row[] = [];
  for (;;) {
    const { data, error } = await service
      .from("ai_generated_questions")
      .select(
        "id,subjects,status,practice_eligible,question_stem,has_visual,visual_type,quality_gate_graph_mode,quality_gate_graph_candidate,quality_gate_diagram_backfill_kind,answer_depends_on_visual,graphs,svg_operator_backfill_choice",
      )
      .neq("status", "deleted")
      .or("status.eq.pending,and(status.eq.approved,practice_eligible.eq.false)")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  type Agg = {
    total: number;
    needsDiagram: number;
    graphFlagNoAsset: number;
    queuedNoAsset: number;
    byReason: Record<string, number>;
  };
  const bySubject = new Map<string, Agg>();

  for (const row of rows) {
    if (!isOffBank(row)) continue;
    const subject = (row.subjects || "(none)").trim() || "(none)";
    const agg = bySubject.get(subject) ?? {
      total: 0,
      needsDiagram: 0,
      graphFlagNoAsset: 0,
      queuedNoAsset: 0,
      byReason: {},
    };
    agg.total += 1;
    const input = {
      questionStem: row.question_stem,
      hasVisual: row.has_visual,
      visualType: row.visual_type,
      qualityGateGraphMode: row.quality_gate_graph_mode,
      qualityGateDiagramBackfillKind: row.quality_gate_diagram_backfill_kind,
      answerDependsOnVisual: row.answer_depends_on_visual,
      graphs: row.graphs,
    };
    const hasAsset = questionHasDiagramAsset(input);
    const block = missingDiagramApprovalBlock(input);
    if (block) {
      agg.needsDiagram += 1;
      agg.byReason[block] = (agg.byReason[block] ?? 0) + 1;
    }
    const mode = (row.quality_gate_graph_mode ?? "").toLowerCase();
    const flagged =
      mode === "missing_expected" ||
      mode === "candidate" ||
      row.quality_gate_graph_candidate === true;
    if (flagged && !hasAsset) agg.graphFlagNoAsset += 1;
    if (row.svg_operator_backfill_choice === "queue" && !hasAsset) {
      agg.queuedNoAsset += 1;
    }
    bySubject.set(subject, agg);
  }

  const subjects = [...bySubject.keys()].sort((a, b) => a.localeCompare(b));
  let totalAll = 0;
  let needAll = 0;
  let flagAll = 0;
  let queueAll = 0;

  console.log(
    "Off-bank only (pending, or approved + practice_eligible=false)\n",
  );
  console.log(
    "Subject".padEnd(12) +
      "Need".padStart(6) +
      " / " +
      "Total".padStart(5) +
      "  " +
      "QG-flag".padStart(8) +
      "  " +
      "Queued".padStart(6),
  );
  console.log("-".repeat(48));
  for (const s of subjects) {
    const a = bySubject.get(s)!;
    totalAll += a.total;
    needAll += a.needsDiagram;
    flagAll += a.graphFlagNoAsset;
    queueAll += a.queuedNoAsset;
    console.log(
      s.padEnd(12) +
        String(a.needsDiagram).padStart(6) +
        " / " +
        String(a.total).padStart(5) +
        "  " +
        String(a.graphFlagNoAsset).padStart(8) +
        "  " +
        String(a.queuedNoAsset).padStart(6),
    );
  }
  console.log("-".repeat(48));
  console.log(
    "ALL".padEnd(12) +
      String(needAll).padStart(6) +
      " / " +
      String(totalAll).padStart(5) +
      "  " +
      String(flagAll).padStart(8) +
      "  " +
      String(queueAll).padStart(6),
  );

  console.log("\nNeed = missingDiagramApprovalBlock (expects diagram, no asset)");
  console.log(
    "QG-flag = quality_gate candidate/missing_expected and still no asset",
  );
  console.log("Queued = svg_operator_backfill_choice=queue and no asset");

  console.log("\nNeed reasons:");
  const reasonTotals: Record<string, number> = {};
  for (const a of bySubject.values()) {
    for (const [r, n] of Object.entries(a.byReason)) {
      reasonTotals[r] = (reasonTotals[r] ?? 0) + n;
    }
  }
  if (Object.keys(reasonTotals).length === 0) {
    console.log("  (none)");
  } else {
    for (const [r, n] of Object.entries(reasonTotals).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${r}: ${n}`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
