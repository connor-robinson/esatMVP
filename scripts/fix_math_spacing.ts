#!/usr/bin/env tsx
/**
 * Script to fix math spacing in existing questions in the database.
 * Adds spaces before and after $$ math delimiters where needed.
 * 
 * Usage: npx tsx scripts/fix_math_spacing.ts
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeMathSpacing } from "../src/lib/utils/mathSpacing";

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing Supabase credentials");
  console.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Question {
  id: string;
  question_stem: string;
  options: Record<string, string>;
  solution_reasoning?: string;
  solution_key_insight?: string;
  distractor_map?: Record<string, string>;
}

async function fixMathSpacing() {
  console.log("Starting math spacing fix...");
  
  let page = 0;
  const pageSize = 100;
  let totalFixed = 0;
  let totalProcessed = 0;
  
  while (true) {
    // Fetch a page of questions
    const { data: questions, error: fetchError } = await supabase
      .from("ai_generated_questions")
      .select("id, question_stem, options, solution_reasoning, solution_key_insight, distractor_map")
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (fetchError) {
      console.error("Error fetching questions:", fetchError);
      break;
    }
    
    if (!questions || questions.length === 0) {
      break;
    }
    
    console.log(`Processing page ${page + 1} (${questions.length} questions)...`);
    
    // Process each question
    for (const question of questions as Question[]) {
      totalProcessed++;
      let needsUpdate = false;
      const updates: any = {};
      
      // Check and normalize question_stem
      if (question.question_stem) {
        const normalized = normalizeMathSpacing(question.question_stem);
        if (normalized !== question.question_stem) {
          updates.question_stem = normalized;
          needsUpdate = true;
        }
      }
      
      // Check and normalize options
      if (question.options && typeof question.options === 'object') {
        const normalizedOptions: Record<string, string> = {};
        let optionsChanged = false;
        
        for (const [key, value] of Object.entries(question.options)) {
          if (typeof value === 'string') {
            const normalized = normalizeMathSpacing(value);
            normalizedOptions[key] = normalized;
            if (normalized !== value) {
              optionsChanged = true;
            }
          } else {
            normalizedOptions[key] = value;
          }
        }
        
        if (optionsChanged) {
          updates.options = normalizedOptions;
          needsUpdate = true;
        }
      }
      
      // Check and normalize solution_reasoning
      if (question.solution_reasoning) {
        const normalized = normalizeMathSpacing(question.solution_reasoning);
        if (normalized !== question.solution_reasoning) {
          updates.solution_reasoning = normalized;
          needsUpdate = true;
        }
      }
      
      // Check and normalize solution_key_insight
      if (question.solution_key_insight) {
        const normalized = normalizeMathSpacing(question.solution_key_insight);
        if (normalized !== question.solution_key_insight) {
          updates.solution_key_insight = normalized;
          needsUpdate = true;
        }
      }
      
      // Check and normalize distractor_map
      if (question.distractor_map && typeof question.distractor_map === 'object') {
        const normalizedDistractorMap: Record<string, string> = {};
        let distractorChanged = false;
        
        for (const [key, value] of Object.entries(question.distractor_map)) {
          if (typeof value === 'string') {
            const normalized = normalizeMathSpacing(value);
            normalizedDistractorMap[key] = normalized;
            if (normalized !== value) {
              distractorChanged = true;
            }
          } else {
            normalizedDistractorMap[key] = value;
          }
        }
        
        if (distractorChanged) {
          updates.distractor_map = normalizedDistractorMap;
          needsUpdate = true;
        }
      }
      
      // Update if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from("ai_generated_questions")
          // @ts-ignore - Supabase type inference issue
          .update(updates)
          .eq("id", question.id);
        
        if (updateError) {
          console.error(`Error updating question ${question.id}:`, updateError);
        } else {
          totalFixed++;
          console.log(`  ✓ Fixed question ${question.id}`);
        }
      }
    }
    
    // If we got fewer questions than pageSize, we're done
    if (questions.length < pageSize) {
      break;
    }
    
    page++;
  }
  
  console.log("\n=== Summary ===");
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total fixed: ${totalFixed}`);
  console.log("Done!");
}

// Run the script
fixMathSpacing().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});






























