/**
 * Script to run the question_choice_stats migration
 * Usage: node scripts/run_migration.js
 */

const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260127192004_create_question_choice_stats.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('Migration file loaded:', migrationPath);
console.log('Migration size:', migrationSQL.length, 'characters');

// Split the migration into individual statements
// PostgreSQL requires statements to be separated properly
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));

console.log('\nFound', statements.length, 'statements to execute');
console.log('\nTo run this migration:');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Paste the contents of: supabase/migrations/20260127192004_create_question_choice_stats.sql');
console.log('4. Click "Run"');
console.log('\nAlternatively, if you have Supabase CLI installed:');
console.log('  supabase db push');
console.log('\nOr if you have psql with connection string:');
console.log('  psql <connection_string> -f supabase/migrations/20260127192004_create_question_choice_stats.sql');

// Display first few statements for verification
console.log('\n--- First 3 statements (preview) ---');
statements.slice(0, 3).forEach((stmt, i) => {
  console.log(`\nStatement ${i + 1}:`);
  console.log(stmt.substring(0, 200) + (stmt.length > 200 ? '...' : ''));
});






