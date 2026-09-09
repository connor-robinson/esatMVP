/**
 * Summarize past-paper conversion pipeline status from Supabase.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '');
      }
    }
  });
}

loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !key) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, key);

async function main() {
  const { count: totalQuestions } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  const { data: textQuestions } = await supabase
    .from('questions')
    .select('id', { count: 'exact' })
    .eq('content_format', 'text');

  const { data: conversions, error: convError } = await supabase
    .from('question_conversions')
    .select('status, conversion_report, confidence');

  if (convError) {
    console.log('question_conversions table not available yet:', convError.message);
    console.log('Run migration: supabase/migrations/20260627100000_past_paper_text_conversion.sql');
    console.log('Total questions:', totalQuestions);
    return;
  }

  const byStatus = {};
  const flagCounts = {};
  const diagramCounts = {
    diagram: 0,
    no_diagram: 0,
    unclassified: 0,
    needs_review: 0,
  };
  for (const row of conversions || []) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    const report = row.conversion_report || {};
    if (report.has_diagram === true) diagramCounts.diagram++;
    else if (report.has_diagram === false) diagramCounts.no_diagram++;
    else diagramCounts.unclassified++;
    if (report.diagram_review_status === 'needs_review') diagramCounts.needs_review++;
    for (const [k, v] of Object.entries(report)) {
      if (v === true || (Array.isArray(v) && v.length > 0)) {
        flagCounts[k] = (flagCounts[k] || 0) + 1;
      }
    }
  }

  const { count: reportCount } = await supabase
    .from('question_conversion_reports')
    .select('*', { count: 'exact', head: true });

  console.log('\n=== Past Paper Conversion Summary ===\n');
  console.log('Total questions:', totalQuestions);
  console.log('Questions with content_format=text:', textQuestions?.length ?? 0);
  console.log('Conversion rows:', conversions?.length ?? 0);
  console.log('\nBy status:');
  Object.entries(byStatus)
    .sort((a, b) => b[1] - a[1])
    .forEach(([s, n]) => console.log(`  ${s}: ${n}`));
  console.log('\nFlag counts (true/non-empty):');
  Object.entries(flagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([f, n]) => console.log(`  ${f}: ${n}`));
  console.log('\nDiagram classification:');
  Object.entries(diagramCounts).forEach(([label, n]) => console.log(`  ${label}: ${n}`));
  console.log('\nUser reports:', reportCount ?? 0);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
