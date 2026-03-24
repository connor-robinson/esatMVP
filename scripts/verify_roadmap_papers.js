/**
 * Verify which papers exist in the database that match the roadmap requirements
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

async function verifyPapers() {
  try {
    console.log('Verifying papers for roadmap requirements...\n');
    
    // Check NSAA 2016-2019 Section 1
    console.log('NSAA 2016-2019 Section 1:');
    for (let year = 2016; year <= 2019; year++) {
      const { data } = await supabase
        .from('papers')
        .select('*')
        .eq('exam_name', 'NSAA')
        .eq('exam_year', year)
        .eq('paper_name', 'Section 1')
        .eq('exam_type', 'Official');
      
      if (data && data.length > 0) {
        const paper = data[0];
        const { data: questions } = await supabase
          .from('questions')
          .select('part_letter, part_name')
          .eq('paper_id', paper.id)
          .limit(100);
        
        const parts = new Set();
        questions?.forEach(q => {
          if (q.part_letter && q.part_name) {
            parts.add(`${q.part_letter}: ${q.part_name}`);
          }
        });
        
        console.log(`  ${year}: Found - Parts: ${Array.from(parts).join(', ')}`);
      } else {
        console.log(`  ${year}: NOT FOUND`);
      }
    }
    
    // Check NSAA 2020-2023 Section 1 & 2
    console.log('\nNSAA 2020-2023:');
    for (let year = 2020; year <= 2023; year++) {
      for (const section of ['Section 1', 'Section 2']) {
        const { data } = await supabase
          .from('papers')
          .select('*')
          .eq('exam_name', 'NSAA')
          .eq('exam_year', year)
          .eq('paper_name', section)
          .eq('exam_type', 'Official');
        
        if (data && data.length > 0) {
          const paper = data[0];
          const { data: questions } = await supabase
            .from('questions')
            .select('part_letter, part_name')
            .eq('paper_id', paper.id)
            .limit(100);
          
          const parts = new Set();
          questions?.forEach(q => {
            if (q.part_letter && q.part_name) {
              parts.add(`${q.part_letter}: ${q.part_name}`);
            }
          });
          
          console.log(`  ${year} ${section}: Found - Parts: ${Array.from(parts).join(', ')}`);
        } else {
          console.log(`  ${year} ${section}: NOT FOUND`);
        }
      }
    }
    
    // Check NSAA 2020 Specimen
    console.log('\nNSAA 2020 Specimen:');
    const { data: spec2020 } = await supabase
      .from('papers')
      .select('*')
      .eq('exam_name', 'NSAA')
      .eq('exam_year', 2020)
      .eq('exam_type', 'Specimen');
    
    if (spec2020 && spec2020.length > 0) {
      console.log(`  Found ${spec2020.length} specimen paper(s)`);
      spec2020.forEach(p => {
        console.log(`    - ${p.paper_name}`);
      });
    } else {
      console.log('  NOT FOUND');
    }
    
    // Check ENGAA Section 1 Part B
    console.log('\nENGAA Section 1 Part B:');
    const engaaYears = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
    for (const year of engaaYears) {
      const { data } = await supabase
        .from('papers')
        .select('*')
        .eq('exam_name', 'ENGAA')
        .eq('exam_year', year)
        .eq('paper_name', 'Section 1')
        .eq('exam_type', year === 2016 ? 'Specimen' : 'Official');
      
      if (data && data.length > 0) {
        const paper = data[0];
        const { data: questions } = await supabase
          .from('questions')
          .select('question_number, part_letter, part_name')
          .eq('paper_id', paper.id)
          .order('question_number');
        
        const partB = questions?.filter(q => 
          q.part_letter?.toLowerCase().includes('b') || 
          q.part_name?.toLowerCase().includes('advanced')
        );
        
        if (partB && partB.length > 0) {
          const qNums = partB.map(q => q.question_number).sort((a, b) => a - b);
          console.log(`  ${year}: Found Part B - Questions ${qNums[0]}-${qNums[qNums.length - 1]} (${partB.length} total)`);
        } else {
          console.log(`  ${year}: Part B NOT FOUND`);
        }
      } else {
        console.log(`  ${year}: Paper NOT FOUND`);
      }
    }
    
    // Check ENGAA Section 2
    console.log('\nENGAA Section 2:');
    for (const year of [2016, 2017, 2018, 2019]) {
      const { data } = await supabase
        .from('papers')
        .select('*')
        .eq('exam_name', 'ENGAA')
        .eq('exam_year', year)
        .eq('paper_name', 'Section 2')
        .in('exam_type', year === 2016 ? ['Official', 'Specimen'] : ['Official']);
      
      if (data && data.length > 0) {
        data.forEach(paper => {
          const { data: questions } = await supabase
            .from('questions')
            .select('part_letter, part_name')
            .eq('paper_id', paper.id)
            .limit(50);
          
          const parts = new Set();
          questions?.forEach(q => {
            if (q.part_letter && q.part_name) {
              parts.add(`${q.part_letter}: ${q.part_name}`);
            }
          });
          
          console.log(`  ${year} ${paper.exam_type}: Found - Parts: ${Array.from(parts).join(', ')}`);
        });
      } else {
        console.log(`  ${year}: NOT FOUND`);
      }
    }
    
    console.log('\n✅ Verification complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

verifyPapers();


