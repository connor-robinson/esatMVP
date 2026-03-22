/**
 * Script to query Supabase and summarize all papers stored in the database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    });
  }
}

loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables!');
  console.error('Please ensure .env.local contains:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function summarizePapers() {
  try {
    console.log('Connecting to Supabase...\n');
    
    // Query all papers
    const { data: papers, error } = await supabase
      .from('papers')
      .select('*')
      .order('exam_name')
      .order('exam_year', { ascending: false })
      .order('paper_name');

    if (error) {
      throw error;
    }

    if (!papers || papers.length === 0) {
      console.log('No papers found in the database.');
      return;
    }

    console.log(`\n📚 Total Papers: ${papers.length}\n`);
    console.log('='.repeat(80));

    // Group papers by exam name
    const papersByExam = {};
    papers.forEach(paper => {
      const examName = paper.exam_name || 'Unknown';
      if (!papersByExam[examName]) {
        papersByExam[examName] = [];
      }
      papersByExam[examName].push(paper);
    });

    // Summarize by exam
    for (const [examName, examPapers] of Object.entries(papersByExam)) {
      console.log(`\n📖 ${examName}`);
      console.log('-'.repeat(80));
      
      // Group by year
      const papersByYear = {};
      examPapers.forEach(paper => {
        const year = paper.exam_year || 'Unknown';
        if (!papersByYear[year]) {
          papersByYear[year] = [];
        }
        papersByYear[year].push(paper);
      });

      // Display by year (newest first)
      const years = Object.keys(papersByYear).sort((a, b) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return parseInt(b) - parseInt(a);
      });

      years.forEach(year => {
        const yearPapers = papersByYear[year];
        console.log(`\n  ${year} (${yearPapers.length} paper${yearPapers.length !== 1 ? 's' : ''}):`);
        
        yearPapers.forEach(paper => {
          const paperName = paper.paper_name || 'Unknown';
          const examType = paper.exam_type || 'Unknown';
          const hasConversion = paper.has_conversion ? '✓' : '✗';
          console.log(`    • ${paperName} (${examType}) - Conversion Table: ${hasConversion}`);
        });
      });
    }

    // Summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Summary Statistics:\n');
    
    const totalExams = Object.keys(papersByExam).length;
    const years = [...new Set(papers.map(p => p.exam_year).filter(Boolean))].sort((a, b) => b - a);
    const papersWithConversion = papers.filter(p => p.has_conversion).length;
    const examTypes = [...new Set(papers.map(p => p.exam_type).filter(Boolean))];
    
    console.log(`  • Total Papers: ${papers.length}`);
    console.log(`  • Unique Exams: ${totalExams}`);
    console.log(`  • Year Range: ${years.length > 0 ? `${Math.min(...years)} - ${Math.max(...years)}` : 'N/A'}`);
    console.log(`  • Papers with Conversion Tables: ${papersWithConversion} (${Math.round(papersWithConversion / papers.length * 100)}%)`);
    console.log(`  • Exam Types: ${examTypes.join(', ')}`);
    
    // Breakdown by exam
    console.log('\n  Breakdown by Exam:');
    Object.entries(papersByExam).forEach(([examName, examPapers]) => {
      console.log(`    • ${examName}: ${examPapers.length} paper${examPapers.length !== 1 ? 's' : ''}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Summary complete!\n');

  } catch (error) {
    console.error('\n❌ Error querying Supabase:');
    console.error(error);
    process.exit(1);
  }
}

summarizePapers();

