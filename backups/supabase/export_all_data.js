/**
 * Export all Supabase data to SQL backup file
 * Uses the Supabase service role key to access all data
 */

const fs = require('fs');
const path = require('path');

// We'll use environment variables or you can set them here
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bcbttpsokwoapjypwwwq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set!');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key');
  console.error('Then run: $env:SUPABASE_SERVICE_ROLE_KEY="your-key" ; node export_all_data.js');
  process.exit(1);
}

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to escape SQL strings
function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  if (Array.isArray(value)) {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::${Array.isArray(value) && value.length > 0 && typeof value[0] === 'number' ? 'integer[]' : 'text[]'}`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

async function exportTable(tableName, backupFile) {
  try {
    console.log(`Exporting ${tableName}...`);
    
    let allData = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, from + pageSize - 1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        hasMore = data.length === pageSize;
        from += pageSize;
      } else {
        hasMore = false;
      }
    }

    if (allData.length === 0) {
      backupFile.write(`-- Table ${tableName}: 0 rows\n\n`);
      console.log(`  ✓ ${tableName}: 0 rows`);
      return;
    }

    backupFile.write(`\n-- ============================================\n`);
    backupFile.write(`-- Table: ${tableName} (${allData.length} rows)\n`);
    backupFile.write(`-- ============================================\n\n`);
    backupFile.write(`TRUNCATE TABLE ${tableName} CASCADE;\n\n`);

    for (const row of allData) {
      const columns = Object.keys(row);
      const values = columns.map(col => escapeSql(row[col]));
      const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      backupFile.write(insertSql);
    }
    backupFile.write('\n');
    
    console.log(`  ✓ ${tableName}: ${allData.length} rows exported`);
  } catch (error) {
    console.error(`  ✗ Error exporting ${tableName}:`, error.message);
    backupFile.write(`-- ERROR exporting ${tableName}: ${error.message}\n\n`);
  }
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const backupFile = path.join(__dirname, `full_backup_${timestamp}.sql`);
  const stream = fs.createWriteStream(backupFile, { encoding: 'utf8' });

  stream.write(`-- ============================================\n`);
  stream.write(`-- Supabase Database Full Backup\n`);
  stream.write(`-- ============================================\n`);
  stream.write(`-- Generated: ${new Date().toISOString()}\n`);
  stream.write(`-- Project: ${SUPABASE_URL}\n`);
  stream.write(`-- Project ID: bcbttpsokwoapjypwwwq\n`);
  stream.write(`-- \n`);
  stream.write(`-- This backup contains:\n`);
  stream.write(`-- 1. All table data as SQL INSERT statements\n`);
  stream.write(`-- 2. Schema is available in supabase/migrations/\n`);
  stream.write(`-- \n`);
  stream.write(`-- To restore:\n`);
  stream.write(`-- 1. Run migrations from supabase/migrations/ first\n`);
  stream.write(`-- 2. Then run this SQL file in Supabase SQL Editor\n`);
  stream.write(`-- ============================================\n\n`);

  // Tables in dependency order (parents before children)
  const tables = [
    'papers',
    'conversion_tables',
    'conversion_rows',
    'questions',
    'profiles',
    'paper_sessions',
    'paper_session_responses',
    'paper_session_sections',
    'drill_items',
    'drill_reviews',
    'drill_sessions',
    'drill_session_attempts',
    'topic_progress',
    'session_presets',
    'lesson_results',
    'builder_sessions',
    'builder_session_questions',
    'builder_attempts',
    'ai_generated_questions',
    'question_bank_attempts',
    'user_daily_metrics',
    'user_streaks',
    'user_insights',
    'question_choice_stats',
  ];

  console.log(`\nExporting ${tables.length} tables...\n`);
  
  for (const table of tables) {
    await exportTable(table, stream);
  }

  stream.end();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✓ Backup completed successfully!`);
  console.log(`✓ File: ${backupFile}`);
  console.log(`\nTo restore this backup:`);
  console.log(`  1. Apply migrations from supabase/migrations/`);
  console.log(`  2. Run this SQL file in Supabase SQL Editor`);
  console.log(`${'='.repeat(60)}\n`);
}

createBackup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
