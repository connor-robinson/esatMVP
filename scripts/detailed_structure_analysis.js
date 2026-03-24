/**
 * Detailed analysis of question structure with more examples
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function detailedAnalysis() {
  try {
    console.log('='.repeat(80));
    console.log('DETAILED STRUCTURE ANALYSIS');
    console.log('='.repeat(80));
    
    // Get examples from each exam type
    const examples = [
      { exam: 'ENGAA', year: 2023, paper: 'Section 1', type: 'Official' },
      { exam: 'ENGAA', year: 2023, paper: 'Section 2', type: 'Official' },
      { exam: 'NSAA', year: 2023, paper: 'Section 1', type: 'Official' },
      { exam: 'TMUA', year: 2023, paper: 'Paper 1', type: 'Official' },
      { exam: 'TMUA', year: 2023, paper: 'Paper 2', type: 'Official' },
    ];

    for (const example of examples) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📚 ${example.exam} ${example.year} - ${example.paper} (${example.type})`);
      console.log('='.repeat(80));
      
      // Get the paper
      const { data: paperData, error: paperError } = await supabase
        .from('papers')
        .select('*')
        .eq('exam_name', example.exam)
        .eq('exam_year', example.year)
        .eq('paper_name', example.paper)
        .eq('exam_type', example.type)
        .single();

      if (paperError || !paperData) {
        console.log(`   ❌ Paper not found`);
        continue;
      }

      console.log(`\n   Paper ID: ${paperData.id}`);
      console.log(`   Has Conversion Table: ${paperData.has_conversion ? 'Yes' : 'No'}`);

      // Get all questions for this paper
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('paper_id', paperData.id)
        .order('question_number');

      if (questionsError || !questions || questions.length === 0) {
        console.log(`   ❌ No questions found`);
        continue;
      }

      console.log(`\n   Total Questions: ${questions.length}`);

      // Group by part
      const parts = {};
      questions.forEach(q => {
        const key = `${q.part_letter || 'N/A'}|${q.part_name || 'N/A'}`;
        if (!parts[key]) {
          parts[key] = {
            partLetter: q.part_letter,
            partName: q.part_name,
            questions: [],
            questionNumbers: []
          };
        }
        parts[key].questions.push(q);
        parts[key].questionNumbers.push(q.question_number);
      });

      console.log(`\n   📋 Parts Structure:`);
      Object.values(parts).forEach((part, idx) => {
        const qNums = part.questionNumbers.sort((a, b) => a - b);
        const range = qNums.length > 1 
          ? `Q${qNums[0]}-${qNums[qNums.length - 1]}` 
          : `Q${qNums[0]}`;
        console.log(`\n      Part ${idx + 1}:`);
        console.log(`         Part Letter: "${part.partLetter || 'N/A'}"`);
        console.log(`         Part Name: "${part.partName || 'N/A'}"`);
        console.log(`         Questions: ${part.questions.length} (${range})`);
        
        // Show first 3 questions as examples
        console.log(`         Sample Questions:`);
        part.questions.slice(0, 3).forEach(q => {
          console.log(`            Q${q.question_number}: Answer = ${q.answer_letter || 'N/A'}`);
        });
      });

      // Explain the hierarchy
      console.log(`\n   📖 Hierarchy Explanation:`);
      console.log(`      • Exam: ${example.exam} (e.g., ENGAA, NSAA, TMUA)`);
      console.log(`      • Year: ${example.year}`);
      console.log(`      • Paper: ${example.paper} (e.g., "Section 1", "Section 2", "Paper 1", "Paper 2")`);
      console.log(`      • Exam Type: ${example.type} (e.g., "Official", "Specimen")`);
      console.log(`      • Parts: Each paper contains parts (identified by part_letter + part_name)`);
      console.log(`      • Questions: Each part contains multiple questions (numbered sequentially)`);
    }

    // Summary of the labeling system
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📝 LABELING SYSTEM SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`
    HIERARCHY:
    ┌─────────────────────────────────────────────────────────────┐
    │ Exam (ENGAA, NSAA, TMUA)                                    │
    │   └─ Year (2016-2023)                                        │
    │       └─ Paper (Section 1, Section 2, Paper 1, Paper 2)     │
    │           └─ Exam Type (Official, Specimen)                 │
    │               └─ Part (identified by part_letter + part_name)│
    │                   └─ Questions (numbered 1, 2, 3, ...)     │
    └─────────────────────────────────────────────────────────────┘

    KEY FIELDS:
    • papers table:
      - exam_name: The exam type (ENGAA, NSAA, TMUA)
      - exam_year: The year (2016-2023)
      - paper_name: The paper identifier ("Section 1", "Section 2", "Paper 1", "Paper 2")
      - exam_type: Whether it's "Official" or "Specimen"

    • questions table:
      - paper_id: Links to the papers table
      - question_number: Sequential number within the paper (1, 2, 3, ...)
      - part_letter: Letter identifier for the part (e.g., "Part A", "Part B")
      - part_name: Name/description of the part (e.g., "Mathematics and Physics", "Physics")
      - answer_letter: The correct answer (A, B, C, D, E, F, G, H)

    EXAM-SPECIFIC PATTERNS:
    
    ENGAA:
      • Section 1: Usually has "Part A: Mathematics and Physics" and "Part B: Advanced Mathematics and Advanced Physics"
      • Section 2: Usually has "Part A: Physics"
    
    NSAA:
      • Section 1: Has multiple parts (A-E):
        - Part A: Mathematics
        - Part B: Physics
        - Part C: Chemistry
        - Part D: Biology
        - Part E: Advanced Mathematics and Advanced Physics (pre-2020 only)
      • Section 2: Only sciences (Physics, Chemistry, Biology) - no Mathematics
    
    TMUA:
      • Paper 1: Usually "Part A: Mathematics" or similar
      • Paper 2: Usually "Part A: Mathematics" or "Mathematical Reasoning"
      • Note: TMUA uses "Paper 1/Paper 2" as the paper_name, not "Section 1/Section 2"

    SECTION MAPPING:
    • The part_letter + part_name combination maps to UI sections via mapPartToSection()
    • For example:
      - "Part A" + "Mathematics and Physics" → "Mathematics and Physics" section
      - "Part A" + "Mathematics" → "Mathematics" section
      - "Part B" + "Physics" → "Physics" section
    `);

    console.log('\n✅ Analysis complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

detailedAnalysis();


