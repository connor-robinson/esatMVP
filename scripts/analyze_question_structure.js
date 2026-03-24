/**
 * Script to analyze the structure of questions and papers in the database
 * to understand sections, papers, and parts
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeStructure() {
  try {
    console.log('Analyzing question and paper structure...\n');
    
    // Get a sample of papers
    const { data: papers, error: papersError } = await supabase
      .from('papers')
      .select('*')
      .order('exam_name')
      .order('exam_year', { ascending: false })
      .limit(5);

    if (papersError) throw papersError;

    console.log('='.repeat(80));
    console.log('PAPER STRUCTURE');
    console.log('='.repeat(80));
    
    for (const paper of papers || []) {
      console.log(`\n📄 Paper: ${paper.exam_name} ${paper.exam_year} - ${paper.paper_name} (${paper.exam_type})`);
      console.log(`   ID: ${paper.id}`);
      
      // Get questions for this paper
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('paper_id', paper.id)
        .order('question_number')
        .limit(20);

      if (questionsError) {
        console.log(`   Error fetching questions: ${questionsError.message}`);
        continue;
      }

      if (!questions || questions.length === 0) {
        console.log('   No questions found');
        continue;
      }

      console.log(`   Total questions in sample: ${questions.length}`);
      
      // Analyze part structure
      const parts = {};
      questions.forEach(q => {
        const partKey = `${q.part_letter || 'N/A'}|${q.part_name || 'N/A'}`;
        if (!parts[partKey]) {
          parts[partKey] = {
            partLetter: q.part_letter,
            partName: q.part_name,
            questionNumbers: [],
            count: 0
          };
        }
        parts[partKey].questionNumbers.push(q.question_number);
        parts[partKey].count++;
      });

      console.log(`\n   Parts found (${Object.keys(parts).length}):`);
      Object.values(parts).forEach(part => {
        const qNums = part.questionNumbers.sort((a, b) => a - b);
        const range = qNums.length > 1 
          ? `Q${qNums[0]}-${qNums[qNums.length - 1]}` 
          : `Q${qNums[0]}`;
        console.log(`     • Part Letter: "${part.partLetter || 'N/A'}" | Part Name: "${part.partName || 'N/A'}" | ${part.count} questions (${range})`);
      });

      // Show first few questions as examples
      console.log(`\n   Sample questions:`);
      questions.slice(0, 5).forEach(q => {
        console.log(`     Q${q.question_number}: Part="${q.part_letter || 'N/A'}", PartName="${q.part_name || 'N/A'}", Answer=${q.answer_letter || 'N/A'}`);
      });
    }

    // Now analyze across all papers to understand patterns
    console.log('\n\n' + '='.repeat(80));
    console.log('CROSS-PAPER ANALYSIS');
    console.log('='.repeat(80));

    // Get all unique part names and letters
    const { data: allQuestions, error: allError } = await supabase
      .from('questions')
      .select('exam_name, paper_name, part_letter, part_name')
      .limit(1000);

    if (allError) throw allError;

    const partPatterns = {};
    const examPartPatterns = {};

    (allQuestions || []).forEach(q => {
      const exam = q.exam_name || 'Unknown';
      const paper = q.paper_name || 'Unknown';
      const partKey = `${q.part_letter || 'N/A'}|${q.part_name || 'N/A'}`;
      
      if (!partPatterns[partKey]) {
        partPatterns[partKey] = {
          partLetter: q.part_letter,
          partName: q.part_name,
          exams: new Set(),
          papers: new Set(),
          count: 0
        };
      }
      
      partPatterns[partKey].exams.add(exam);
      partPatterns[partKey].papers.add(`${exam} ${paper}`);
      partPatterns[partKey].count++;

      if (!examPartPatterns[exam]) {
        examPartPatterns[exam] = {};
      }
      if (!examPartPatterns[exam][partKey]) {
        examPartPatterns[exam][partKey] = 0;
      }
      examPartPatterns[exam][partKey]++;
    });

    console.log('\n📊 Part Patterns Across All Papers:');
    console.log(`   Total unique part combinations: ${Object.keys(partPatterns).length}`);
    
    const sortedParts = Object.entries(partPatterns)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15);

    sortedParts.forEach(([key, data]) => {
      console.log(`\n   "${data.partLetter || 'N/A'}" | "${data.partName || 'N/A'}":`);
      console.log(`     • Used in ${data.count} questions`);
      console.log(`     • Exams: ${Array.from(data.exams).join(', ')}`);
      console.log(`     • Papers: ${Array.from(data.papers).slice(0, 3).join(', ')}${data.papers.size > 3 ? '...' : ''}`);
    });

    console.log('\n\n📋 Part Patterns by Exam:');
    Object.entries(examPartPatterns).forEach(([exam, patterns]) => {
      console.log(`\n   ${exam}:`);
      const sorted = Object.entries(patterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      sorted.forEach(([partKey, count]) => {
        const [letter, name] = partKey.split('|');
        console.log(`     • "${letter || 'N/A'}" | "${name || 'N/A'}": ${count} questions`);
      });
    });

    // Analyze paper_name values
    console.log('\n\n' + '='.repeat(80));
    console.log('PAPER NAME ANALYSIS');
    console.log('='.repeat(80));

    const { data: paperNames, error: paperError } = await supabase
      .from('papers')
      .select('exam_name, paper_name, exam_type')
      .order('exam_name')
      .order('exam_year', { ascending: false });

    if (paperError) throw paperError;

    const paperNamePatterns = {};
    (paperNames || []).forEach(p => {
      const exam = p.exam_name || 'Unknown';
      if (!paperNamePatterns[exam]) {
        paperNamePatterns[exam] = new Set();
      }
      paperNamePatterns[exam].add(p.paper_name);
    });

    Object.entries(paperNamePatterns).forEach(([exam, names]) => {
      console.log(`\n   ${exam} paper names:`);
      Array.from(names).sort().forEach(name => {
        console.log(`     • ${name}`);
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('\n❌ Error analyzing structure:');
    console.error(error);
    process.exit(1);
  }
}

analyzeStructure();


