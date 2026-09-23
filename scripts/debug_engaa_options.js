const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts
            .join("=")
            .replace(/^["']|["']$/g, "");
        }
      }
    });
}

loadEnvFile();

const script = `
import { buildSectionOptions } from './src/lib/scoreConverter/esatModules.ts';
import { createServerClient } from './src/lib/supabase/server.ts';
import { fetchConversionRowsForTables } from './src/lib/scoreConverter/fetchConversionRows.server.ts';

async function show(year) {
  const supabase = createServerClient();
  const { data: papers } = await supabase.from('papers').select('id, paper_name').eq('exam_name','ENGAA').eq('exam_year', year).eq('has_conversion', true);
  if (!papers?.length) return;
  const paperNameById = new Map(papers.map(p => [p.id, p.paper_name]));
  const { data: tables } = await supabase.from('conversion_tables').select('id, paper_id, confidence, format_type, reliability_note').in('paper_id', papers.map(p => p.id));
  const tableMeta = new Map(tables.map(t => [t.id, t]));
  const convRows = await fetchConversionRowsForTables(supabase, tables.map(t => t.id));
  const maxByKey = new Map();
  for (const r of convRows) {
    const k = r.table_id + '::' + r.part_name;
    maxByKey.set(k, Math.max(maxByKey.get(k) ?? 0, r.raw_score));
  }
  const rawParts = [];
  for (const [key, maxRaw] of maxByKey) {
    const [tableIdStr, partName] = key.split('::');
    const tableId = Number(tableIdStr);
    const meta = tableMeta.get(tableId);
    rawParts.push({ paperName: paperNameById.get(meta.paper_id), partName, maxRaw, tableId, confidence: meta.confidence, formatType: meta.format_type, reliabilityNote: meta.reliability_note });
  }
  const options = buildSectionOptions('ENGAA', year, rawParts);
  console.log('--- ENGAA ' + year + ' ---');
  console.log('DB parts:', rawParts.map(p => p.paperName + ' / ' + p.partName).join(', '));
  for (const o of options) {
    console.log('  option:', o.group, '|', o.partName, '|', o.moduleLabel || o.legacyLabel);
  }
}

for (const y of [2019, 2020, 2021]) await show(y);
`;

const output = execSync(`npx tsx -e ${JSON.stringify(script)}`, {
  cwd: path.join(__dirname, ".."),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
console.log(output);
