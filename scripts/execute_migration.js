/**
 * Execute the question_choice_stats migration using Supabase client
 * Usage: node scripts/execute_migration.js
 * 
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL not found in environment');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY not found');
  console.log('Please set SUPABASE_SERVICE_ROLE_KEY in .env.local (recommended)');
  console.log('Or use NEXT_PUBLIC_SUPABASE_ANON_KEY (less secure)');
  process.exit(1);
}

// Read migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260127192004_create_question_choice_stats.sql');
let migrationSQL;

try {
  migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('✓ Migration file loaded:', migrationPath);
} catch (error) {
  console.error('Error reading migration file:', error.message);
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  console.log('\nStarting migration execution...');
  console.log('Project URL:', supabaseUrl);
  
  try {
    // Execute the migration SQL
    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We need to use the REST API or RPC
    console.log('\n⚠️  Supabase JS client cannot execute raw SQL directly.');
    console.log('\nPlease use one of these methods:');
    console.log('\n1. SUPABASE DASHBOARD (Recommended):');
    console.log('   - Go to https://supabase.com/dashboard');
    console.log('   - Select your project');
    console.log('   - Go to SQL Editor');
    console.log('   - Paste the contents of:', migrationPath);
    console.log('   - Click "Run"');
    
    console.log('\n2. SUPABASE CLI:');
    console.log('   - Install: npm install -g supabase');
    console.log('   - Run: supabase db push');
    
    console.log('\n3. PSQL (if you have connection string):');
    console.log('   - Get connection string from Supabase Dashboard > Settings > Database');
    console.log('   - Run: psql "<connection_string>" -f', migrationPath);
    
    console.log('\n4. CURL (using REST API):');
    console.log('   curl -X POST \\');
    console.log('     -H "apikey: ' + supabaseServiceKey.substring(0, 20) + '..." \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"query": "' + migrationSQL.replace(/'/g, "\\'").substring(0, 100) + '..."}\' \\');
    console.log('     ' + supabaseUrl + '/rest/v1/rpc/exec_sql');
    
    // Try to test connection
    console.log('\n\nTesting Supabase connection...');
    const { data, error } = await supabase.from('paper_sessions').select('id').limit(1);
    
    if (error) {
      console.error('✗ Connection test failed:', error.message);
      console.log('\nPlease check your credentials and try the manual methods above.');
    } else {
      console.log('✓ Connection successful!');
      console.log('  You can now use the Supabase Dashboard to run the migration.');
    }
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.log('\nPlease use the Supabase Dashboard SQL Editor to run the migration manually.');
  }
}

executeMigration().catch(console.error);






