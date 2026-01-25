/**
 * Curriculum mapping utility for ESAT and TMUA tags
 * Maps tag codes to their full curriculum text
 */

import type { ReviewQuestion } from '@/types/review';

// ESAT Curriculum Data (from ESAT_CURRICULUM.json)
const ESAT_CURRICULUM = {
  papers: [
    {
      paper_id: "math1",
      paper_name: "Mathematics 1",
      topics: [
        { code: "M1", title: "Units" },
        { code: "M2", title: "Number" },
        { code: "M3", title: "Ratio and proportion" },
        { code: "M4", title: "Algebra" },
        { code: "M5", title: "Geometry" },
        { code: "M6", title: "Statistics" },
        { code: "M7", title: "Probability" }
      ]
    },
    {
      paper_id: "biology",
      paper_name: "Biology",
      topics: [
        { code: "B1", title: "Cells" },
        { code: "B2", title: "Movement across membranes" },
        { code: "B3", title: "Cell division and sex determination" },
        { code: "B4", title: "Inheritance" },
        { code: "B5", title: "DNA" },
        { code: "B6", title: "Gene technologies" },
        { code: "B7", title: "Variation" },
        { code: "B8", title: "Enzymes" },
        { code: "B9", title: "Animal physiology" },
        { code: "B10", title: "Ecosystems" },
        { code: "B11", title: "Plant physiology" }
      ]
    },
    {
      paper_id: "chemistry",
      paper_name: "Chemistry",
      topics: [
        { code: "C1", title: "Atomic structure" },
        { code: "C2", title: "The Periodic Table" },
        { code: "C3", title: "Chemical reactions, formulae and equations" },
        { code: "C4", title: "Quantitative chemistry" },
        { code: "C5", title: "Oxidation, reduction and redox" },
        { code: "C6", title: "Chemical bonding, structure and properties" },
        { code: "C7", title: "Group chemistry" },
        { code: "C8", title: "Separation techniques" },
        { code: "C9", title: "Acids, bases and salts" },
        { code: "C10", title: "Rates of reaction" },
        { code: "C11", title: "Energetics" },
        { code: "C12", title: "Electrolysis" },
        { code: "C13", title: "Carbon/Organic chemistry" },
        { code: "C14", title: "Metals" },
        { code: "C15", title: "Kinetic/Particle theory" },
        { code: "C16", title: "Chemical tests" },
        { code: "C17", title: "Air and water" }
      ]
    },
    {
      paper_id: "physics",
      paper_name: "Physics",
      topics: [
        { code: "P1", title: "Electricity" },
        { code: "P2", title: "Magnetism" },
        { code: "P3", title: "Mechanics" },
        { code: "P4", title: "Thermal physics" },
        { code: "P5", title: "Matter" },
        { code: "P6", title: "Waves" },
        { code: "P7", title: "Radioactivity" }
      ]
    },
    {
      paper_id: "math2",
      paper_name: "Mathematics 2",
      topics: [
        { code: "MM1", title: "Algebra and functions" },
        { code: "MM2", title: "Coordinate geometry" },
        { code: "MM3", title: "Trigonometry" },
        { code: "MM4", title: "Exponentials and logarithms" },
        { code: "MM5", title: "Sequences and series" },
        { code: "MM6", title: "Binomial expansion" },
        { code: "MM7", title: "Differentiation and integration" }
      ]
    }
  ]
};

// TMUA Curriculum Mapping (from Spec.md)
const TMUA_CURRICULUM: Record<string, string> = {
  // Paper 1, Section 1, Part 1 (AS pure maths level)
  "MM1": "Algebra and functions",
  "MM2": "Sequences and series",
  "MM3": "Coordinate geometry in the (x, y)-plane",
  "MM4": "Trigonometry",
  "MM5": "Exponentials and logarithms",
  "MM6": "Differentiation",
  "MM7": "Integration",
  "MM8": "Graphs of functions",
  
  // Paper 1, Section 1, Part 2 (Higher GCSE coverage)
  "M1": "Units",
  "M2": "Number",
  "M3": "Ratio and proportion",
  "M4": "Algebra",
  "M5": "Geometry",
  "M6": "Statistics",
  "M7": "Probability",
  
  // Paper 2, Section 2 - The Logic of Arguments
  "Arg1": "Propositional Logic",
  "Arg2": "Necessary vs Sufficient",
  "Arg3": "Quantifiers",
  "Arg4": "Statement Negation",
  
  // Paper 2, Section 2 - Mathematical Proof
  "Prf1": "Proof Methods",
  "Prf2": "Logical Implications",
  "Prf3": "Conjecture Justification",
  "Prf4": "Proof Ordering",
  "Prf5": "Multi-step Reasoning",
  
  // Paper 2, Section 2 - Identifying Errors in Proofs
  "Err1": "Proof Error Spotting",
  "Err2": "Invalid Inference Traps"
};

/**
 * Determine if a question is ESAT based on paper field or primary_tag
 */
export function isESATQuestion(question: ReviewQuestion): boolean {
  const paper = question.paper;
  if (paper === 'Math 1' || paper === 'Math 2' || paper === 'Physics' || 
      paper === 'Chemistry' || paper === 'Biology') {
    return true;
  }
  
  // Fallback: check primary_tag prefix
  if (question.primary_tag) {
    const tag = question.primary_tag;
    return tag.startsWith('M1-') || tag.startsWith('M2-') || 
           tag.startsWith('P-') || tag.startsWith('C-') || 
           tag.startsWith('biology-');
  }
  
  return false;
}

/**
 * Determine if a question is TMUA based on paper field or primary_tag
 */
export function isTMUAQuestion(question: ReviewQuestion): boolean {
  const paper = question.paper;
  if (paper === 'Paper 1' || paper === 'Paper 2') {
    return true;
  }
  
  // Fallback: check primary_tag format (no prefix, raw codes)
  // TMUA tags don't have prefixes like ESAT - they're raw codes
  if (question.primary_tag) {
    const tag = question.primary_tag;
    // Check if it's NOT an ESAT tag (ESAT has prefixes)
    const isESATTag = tag.includes('-') && (
      tag.startsWith('M1-') || tag.startsWith('M2-') || 
      tag.startsWith('P-') || tag.startsWith('C-') || 
      tag.startsWith('biology-')
    );
    
    if (!isESATTag) {
      // Check if it matches TMUA pattern and exists in TMUA curriculum
      if (/^(MM[1-8]|M[1-7]|Arg[1-4]|Prf[1-5]|Err[12])$/.test(tag)) {
        return TMUA_CURRICULUM[tag] !== undefined;
      }
    }
  }
  
  return false;
}

/**
 * Get paper type (ESAT or TMUA) from a question
 */
export function getPaperType(question: ReviewQuestion): 'ESAT' | 'TMUA' | null {
  if (isESATQuestion(question)) return 'ESAT';
  if (isTMUAQuestion(question)) return 'TMUA';
  return null;
}

/**
 * Parse ESAT tag and return curriculum text
 * ESAT tags have format: prefix-code (e.g., M2-MM1, P-P1, biology-B1)
 */
function getESATTagText(tag: string): string | null {
  if (!tag) return null;
  
  // Map prefixes to paper_id
  const prefixMap: Record<string, string> = {
    'M1-': 'math1',
    'M2-': 'math2',
    'P-': 'physics',
    'C-': 'chemistry',
    'biology-': 'biology'
  };
  
  // Find matching prefix
  let paperId: string | null = null;
  let code: string | null = null;
  
  for (const [prefix, pid] of Object.entries(prefixMap)) {
    if (tag.startsWith(prefix)) {
      paperId = pid;
      code = tag.substring(prefix.length);
      break;
    }
  }
  
  if (!paperId || !code) {
    return null;
  }
  
  // Find paper and topic
  const paper = ESAT_CURRICULUM.papers.find(p => p.paper_id === paperId);
  if (!paper) {
    return null;
  }
  
  const topic = paper.topics.find(t => t.code === code);
  return topic ? topic.title : null;
}

/**
 * Parse TMUA tag and return curriculum text
 * TMUA tags are raw codes (e.g., MM1, Arg1, Prf1)
 */
function getTMUATagText(tag: string): string | null {
  if (!tag) return null;
  return TMUA_CURRICULUM[tag] || null;
}

/**
 * Get curriculum text for a tag based on paper type
 */
export function getTagText(tag: string | null, paperType: 'ESAT' | 'TMUA' | null): string | null {
  if (!tag) return null;
  
  if (paperType === 'ESAT') {
    return getESATTagText(tag);
  } else if (paperType === 'TMUA') {
    return getTMUATagText(tag);
  }
  
  // Auto-detect if paperType not provided
  // Try ESAT first (has prefixes)
  if (tag.includes('-')) {
    const esatText = getESATTagText(tag);
    if (esatText) return esatText;
  }
  
  // Try TMUA (raw codes)
  const tmuaText = getTMUATagText(tag);
  if (tmuaText) return tmuaText;
  
  return null;
}

/**
 * Get tag text for a question (auto-detects paper type)
 */
export function getQuestionTagText(question: ReviewQuestion, tag: string | null): string | null {
  if (!tag) return null;
  const paperType = getPaperType(question);
  return getTagText(tag, paperType);
}

/**
 * Format tag for display: shows code and text if available
 */
export function formatTagDisplay(tag: string | null, text: string | null): string {
  if (!tag) return '';
  if (text) {
    return `${tag} (${text})`;
  }
  return tag;
}

