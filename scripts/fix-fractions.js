#!/usr/bin/env node
/**
 * Fix fraction formatting in question options
 * 
 * This script checks all questions in the database and fixes any \frac{...} 
 * expressions in options that are not wrapped in $ delimiters for KaTeX rendering.
 * 
 * Usage:
 *   node scripts/fix-fractions.js [--dry-run] [--limit=N]
 */

// Try to load .env.local if dotenv is available
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not available, try to load env vars directly
}

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('Make sure .env.local exists with these variables');
  console.error(`SUPABASE_URL: ${supabaseUrl ? 'SET' : 'NOT SET'}`);
  console.error(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? 'SET' : 'NOT SET'}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if a position in text is inside $...$ or $$...$$ delimiters
 */
function isPositionInMathDelimiters(text, position) {
  // Find all display math ($$...$$) blocks
  const displayPattern = /\$\$/g;
  const displayMatches = [];
  let match;
  
  while ((match = displayPattern.exec(text)) !== null) {
    displayMatches.push(match.index);
  }
  
  // Pair up $$ delimiters
  const displayRanges = [];
  for (let i = 0; i < displayMatches.length - 1; i += 2) {
    displayRanges.push([displayMatches[i], displayMatches[i + 1] + 2]);
  }
  
  // Check if position is in any display math range
  for (const [start, end] of displayRanges) {
    if (start <= position && position < end) {
      return true;
    }
  }
  
  // Find inline math ($...$) that doesn't overlap with display math
  let searchIndex = 0;
  while (searchIndex < text.length) {
    const dollarIndex = text.indexOf('$', searchIndex);
    if (dollarIndex === -1) break;
    
    // Check if this is part of a display math block ($$)
    const isDisplayStart = dollarIndex < text.length - 1 && text[dollarIndex + 1] === '$';
    if (isDisplayStart) {
      // Skip to after the display math block
      const displayEnd = text.indexOf('$$', dollarIndex + 2);
      if (displayEnd !== -1) {
        searchIndex = displayEnd + 2;
        continue;
      }
    }
    
    // This is a potential inline math start
    const inlineEnd = text.indexOf('$', dollarIndex + 1);
    if (inlineEnd !== -1) {
      // Check if this is not part of a display math block
      const isPartOfDisplay = displayRanges.some(
        ([dmStart, dmEnd]) => dollarIndex >= dmStart && dollarIndex < dmEnd
      );
      
      if (!isPartOfDisplay) {
        const start = dollarIndex;
        const end = inlineEnd + 1;
        if (start <= position && position < end) {
          return true;
        }
      }
      searchIndex = inlineEnd + 1;
    } else {
      break;
    }
  }
  
  return false;
}

/**
 * Check if text contains \frac{...} that is not wrapped in $ delimiters
 */
function hasFracWithoutDelimiters(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Find all \frac{...}{...} occurrences
  const fracPattern = /\\frac\{[^}]*\}\{[^}]*\}/g;
  
  while ((match = fracPattern.exec(text)) !== null) {
    // Check if the start of this \frac is inside math delimiters
    if (!isPositionInMathDelimiters(text, match.index)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Wrap any \frac{...} expressions that are not already in $ delimiters
 * with $ delimiters.
 */
function fixFracFormatting(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Find all \frac{...}{...} occurrences
  const fracPattern = /\\frac\{[^}]*\}\{[^}]*\}/g;
  const fracMatches = [];
  let match;
  
  while ((match = fracPattern.exec(text)) !== null) {
    fracMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }
  
  // Process matches in reverse order to maintain correct indices
  let result = text;
  for (let i = fracMatches.length - 1; i >= 0; i--) {
    const { start, end, content } = fracMatches[i];
    
    // Check if this \frac is inside math delimiters
    if (!isPositionInMathDelimiters(result, start)) {
      // Wrap this \frac with $ delimiters
      result = result.slice(0, start) + '$' + content + '$' + result.slice(end);
    }
  }
  
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  console.log('='.repeat(80));
  console.log('Fraction Formatting Fix Script');
  console.log('='.repeat(80));
  console.log();

  if (dryRun) {
    console.log('DRY RUN MODE: No changes will be made to the database');
    console.log();
  }

  // Fetch all questions
  console.log('Fetching questions from database...');
  let query = supabase
    .from('ai_generated_questions')
    .select('id, options, generation_id, schema_id');

  if (limit) {
    query = query.limit(limit);
  }

  const { data: questions, error: queryError } = await query;

  if (queryError) {
    console.error('Error fetching questions:', queryError);
    process.exit(1);
  }

  if (!questions || questions.length === 0) {
    console.log('No questions found in database');
    return;
  }

  console.log(`Found ${questions.length} questions to check`);
  console.log();

  // Check each question
  const questionsNeedingFix = [];
  let totalOptionsFixed = 0;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const options = question.options;
    
    if (!options || typeof options !== 'object') {
      continue;
    }

    // Parse options if it's a string
    let parsedOptions;
    if (typeof options === 'string') {
      try {
        parsedOptions = JSON.parse(options);
      } catch (e) {
        console.warn(`  Warning: Could not parse options for question ${question.id}`);
        continue;
      }
    } else {
      parsedOptions = options;
    }

    const updatedOptions = {};
    const fixedOptions = [];
    let needsFix = false;

    for (const [optionKey, optionValue] of Object.entries(parsedOptions)) {
      if (typeof optionValue !== 'string') {
        updatedOptions[optionKey] = optionValue;
        continue;
      }

      if (hasFracWithoutDelimiters(optionValue)) {
        needsFix = true;
        const fixedValue = fixFracFormatting(optionValue);
        updatedOptions[optionKey] = fixedValue;
        fixedOptions.push(optionKey);
        totalOptionsFixed++;
        
        if (!dryRun) {
          console.log(`    Fixed option ${optionKey}: ${optionValue.substring(0, 50)}... -> ${fixedValue.substring(0, 50)}...`);
        }
      } else {
        updatedOptions[optionKey] = optionValue;
      }
    }

    if (needsFix) {
      questionsNeedingFix.push({
        id: question.id,
        generation_id: question.generation_id || 'unknown',
        schema_id: question.schema_id || 'unknown',
        updated_options: updatedOptions,
        fixedOptions,
      });

      if (!dryRun) {
        console.log(`  Question ${i + 1}/${questions.length}: ${question.generation_id || question.id} (${question.schema_id || 'unknown'}) - ${fixedOptions.length} option(s) fixed`);
      } else {
        console.log(`  Question ${i + 1}/${questions.length}: ${question.generation_id || question.id} (${question.schema_id || 'unknown'}) - ${fixedOptions.length} option(s) need fixing`);
      }
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('Summary:');
  console.log(`  Total questions checked: ${questions.length}`);
  console.log(`  Questions needing fix: ${questionsNeedingFix.length}`);
  console.log(`  Total options fixed: ${totalOptionsFixed}`);
  console.log('='.repeat(80));

  if (dryRun) {
    console.log();
    console.log('This was a dry run. Run without --dry-run to apply fixes.');
    return;
  }

  if (questionsNeedingFix.length === 0) {
    console.log();
    console.log('No questions need fixing!');
    return;
  }

  // Apply fixes
  console.log();
  console.log('Applying fixes to database...');

  for (let i = 0; i < questionsNeedingFix.length; i++) {
    const questionData = questionsNeedingFix[i];
    
    try {
      const { error: updateError } = await supabase
        .from('ai_generated_questions')
        .update({ options: questionData.updated_options })
        .eq('id', questionData.id);

      if (updateError) {
        console.error(`  ERROR updating question ${questionData.generation_id}:`, updateError);
      } else {
        console.log(`  [${i + 1}/${questionsNeedingFix.length}] Updated question ${questionData.generation_id}`);
      }
    } catch (error) {
      console.error(`  ERROR updating question ${questionData.generation_id}:`, error);
    }
  }

  console.log();
  console.log('Done!');
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

