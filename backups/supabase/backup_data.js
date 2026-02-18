/**
 * Quick Supabase Data Backup Script
 * Exports all table data to SQL INSERT statements
 * 
 * Usage:
 *   Set SUPABASE_SERVICE_ROLE_KEY environment variable
 *   node backup_data.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bcbttpsokwoapjypwwwq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Escape SQL strings
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'boolean') return str ? 'true' : 'false';
  if (typeof str === 'number') return str.toString();
  if (typeof str === 'object') {
    return `'${JSON.stringify(str).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function exportTable(tableName, backupFile) {
  try {
    console.log(`  Exporting ${tableName}...`);
    
    // Get all data (with pagination if needed)
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    if (allData.length === 0) {
      backupFile.write(`-- Table ${tableName}: 0 rows\n\n`);
      return;
    }

    backupFile.write(`\n-- Table: ${tableName} (${allData.length} rows)\n`);
    backupFile.write(`TRUNCATE TABLE ${tableName} CASCADE;\n\n`);

    for (const row of allData) {
      const columns = Object.keys(row);
      const values = columns.map(col => escapeSql(row[col]));
      const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      backupFile.write(insertSql);
    }
    backupFile.write('\n');
    
    console.log(`    ✓ Exported ${allData.length} rows`);
  } catch (error) {
    console.error(`    ✗ Error exporting ${tableName}:`, error.message);
    backupFile.write(`-- ERROR exporting ${tableName}: ${error.message}\n\n`);
  }
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(__dirname, `backup_data_${timestamp}.sql`);
  const stream = fs.createWriteStream(backupFile, { encoding: 'utf8' });

  stream.write(`-- Supabase Database Data Backup\n`);
  stream.write(`-- Generated: ${new Date().toISOString()}\n`);
  stream.write(`-- Project: ${SUPABASE_URL}\n`);
  stream.write(`-- Note: This backup contains DATA only. Schema is in supabase/migrations/\n\n`);

  const tables = [
    'questions',
    'papers',
    'conversion_tables',
    'conversion_rows',
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
    'user_daily_metrics',
    'user_streaks',
    'user_insights',
    'ai_generated_questions',
    'question_bank_attempts',
    'profiles',
    'question_choice_stats'
  ];

  console.log(`Exporting data from ${tables.length} tables...\n`);
  
  for (const table of tables) {
    await exportTable(table, stream);
  }

  stream.end();
  
  console.log(`\n✓ Backup completed: ${backupFile}`);
  console.log(`\nTo restore, run this SQL file in Supabase SQL Editor or using psql.`);
}

createBackup().catch(console.error);
