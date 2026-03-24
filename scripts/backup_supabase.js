/**
 * Quick Supabase Backup Script
 * Exports all database tables to JSON files
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local

function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          if (key && value) {
            process.env[key.trim()] = value.trim();
          }
        }
      }
    }
  } catch (e) {
    // Ignore errors, will try process.env directly
  }
}

// Try multiple paths
const envPaths = [
  path.join(__dirname, '..', '.env.local'),
  '.env.local',
  path.join(process.cwd(), '.env.local'),
];

for (const envPath of envPaths) {
  loadEnvFile(envPath);
}

// Also try dotenv if available
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not available, that's okay
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

// Create client with service role key for full access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create backup directory with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupDir = path.join(__dirname, '..', 'supabase_backups', timestamp);
fs.mkdirSync(backupDir, { recursive: true });

console.log(`Creating backup in: ${backupDir}`);

// List of tables to backup
const tables = [
  'paper_sessions',
  'drill_items',
  'drill_sessions',
  'drill_session_attempts',
  'topic_progress',
  'session_presets',
  'builder_sessions',
  'builder_session_questions',
  'builder_attempts',
  'ai_generated_questions',
  'user_profiles',
  'user_daily_metrics',
  'question_bank_attempts',
];

async function backupTable(tableName) {
  try {
    console.log(`Backing up table: ${tableName}...`);
    
    // Fetch all data (paginated if needed)
    let allData = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, from + batchSize - 1);

      if (error) {
        console.error(`Error backing up ${tableName}:`, error.message);
        return null;
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    // Save to JSON file
    const filePath = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
    console.log(`  ✓ Saved ${allData.length} records to ${filePath}`);
    return { table: tableName, count: allData.length };
  } catch (error) {
    console.error(`Error backing up ${tableName}:`, error.message);
    return null;
  }
}

async function backupMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationsBackupDir = path.join(backupDir, 'migrations');
      fs.mkdirSync(migrationsBackupDir, { recursive: true });
      
      const files = fs.readdirSync(migrationsDir);
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const sourcePath = path.join(migrationsDir, file);
          const destPath = path.join(migrationsBackupDir, file);
          fs.copyFileSync(sourcePath, destPath);
        }
      }
      console.log(`  ✓ Copied ${files.length} migration files`);
    }
  } catch (error) {
    console.error('Error backing up migrations:', error.message);
  }
}

async function main() {
  console.log('Starting Supabase backup...\n');
  
  const results = [];
  
  // Backup all tables
  for (const table of tables) {
    const result = await backupTable(table);
    if (result) {
      results.push(result);
    }
  }

  // Backup migrations
  await backupMigrations();

  // Create summary
  const summary = {
    timestamp: new Date().toISOString(),
    supabaseUrl: supabaseUrl,
    tables: results,
    totalRecords: results.reduce((sum, r) => sum + (r?.count || 0), 0),
  };

  const summaryPath = path.join(backupDir, 'backup_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log('\n=== Backup Complete ===');
  console.log(`Location: ${backupDir}`);
  console.log(`Total records: ${summary.totalRecords}`);
  console.log(`Tables backed up: ${results.length}`);
  console.log(`Summary saved to: ${summaryPath}`);
}

main().catch(console.error);

