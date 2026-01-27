-- Migration: Map Tag Codes to Curriculum Text Names
-- Description: Maps all existing tag codes (M1-M7, MM1-MM8, etc.) to curriculum text names

-- Create a function to map ESAT tag codes to text
CREATE OR REPLACE FUNCTION map_esat_tag_to_text(tag_code text, paper_id text)
RETURNS text AS $$
BEGIN
  -- Math 1 tags (M1-M7)
  IF paper_id = 'math1' THEN
    RETURN CASE tag_code
      WHEN 'M1' THEN 'Units'
      WHEN 'M2' THEN 'Number'
      WHEN 'M3' THEN 'Ratio and proportion'
      WHEN 'M4' THEN 'Algebra'
      WHEN 'M5' THEN 'Geometry'
      WHEN 'M6' THEN 'Statistics'
      WHEN 'M7' THEN 'Probability'
      ELSE tag_code
    END;
  END IF;
  
  -- Math 2 tags (MM1-MM7, but stored as M1-M7 in some cases)
  IF paper_id = 'math2' THEN
    RETURN CASE tag_code
      WHEN 'MM1' THEN 'Algebra and functions'
      WHEN 'MM2' THEN 'Coordinate geometry'
      WHEN 'MM3' THEN 'Trigonometry'
      WHEN 'MM4' THEN 'Exponentials and logarithms'
      WHEN 'MM5' THEN 'Sequences and series'
      WHEN 'MM6' THEN 'Binomial expansion'
      WHEN 'MM7' THEN 'Differentiation and integration'
      WHEN 'M1' THEN 'Algebra and functions'
      WHEN 'M2' THEN 'Coordinate geometry'
      WHEN 'M3' THEN 'Trigonometry'
      WHEN 'M4' THEN 'Exponentials and logarithms'
      WHEN 'M5' THEN 'Sequences and series'
      WHEN 'M6' THEN 'Binomial expansion'
      WHEN 'M7' THEN 'Differentiation and integration'
      ELSE tag_code
    END;
  END IF;
  
  -- Physics tags (P1-P7)
  IF paper_id = 'physics' THEN
    RETURN CASE tag_code
      WHEN 'P1' THEN 'Electricity'
      WHEN 'P2' THEN 'Magnetism'
      WHEN 'P3' THEN 'Mechanics'
      WHEN 'P4' THEN 'Thermal physics'
      WHEN 'P5' THEN 'Matter'
      WHEN 'P6' THEN 'Waves'
      WHEN 'P7' THEN 'Radioactivity'
      ELSE tag_code
    END;
  END IF;
  
  -- Chemistry tags (C1-C17)
  IF paper_id = 'chemistry' THEN
    RETURN CASE tag_code
      WHEN 'C1' THEN 'Atomic structure'
      WHEN 'C2' THEN 'The Periodic Table'
      WHEN 'C3' THEN 'Chemical reactions, formulae and equations'
      WHEN 'C4' THEN 'Quantitative chemistry'
      WHEN 'C5' THEN 'Oxidation, reduction and redox'
      WHEN 'C6' THEN 'Chemical bonding, structure and properties'
      WHEN 'C7' THEN 'Group chemistry'
      WHEN 'C8' THEN 'Separation techniques'
      WHEN 'C9' THEN 'Acids, bases and salts'
      WHEN 'C10' THEN 'Rates of reaction'
      WHEN 'C11' THEN 'Energetics'
      WHEN 'C12' THEN 'Electrolysis'
      WHEN 'C13' THEN 'Carbon/Organic chemistry'
      WHEN 'C14' THEN 'Metals'
      WHEN 'C15' THEN 'Kinetic/Particle theory'
      WHEN 'C16' THEN 'Chemical tests'
      WHEN 'C17' THEN 'Air and water'
      ELSE tag_code
    END;
  END IF;
  
  -- Biology tags (B1-B11)
  IF paper_id = 'biology' THEN
    RETURN CASE tag_code
      WHEN 'B1' THEN 'Cells'
      WHEN 'B2' THEN 'Movement across membranes'
      WHEN 'B3' THEN 'Cell division and sex determination'
      WHEN 'B4' THEN 'Inheritance'
      WHEN 'B5' THEN 'DNA'
      WHEN 'B6' THEN 'Gene technologies'
      WHEN 'B7' THEN 'Variation'
      WHEN 'B8' THEN 'Enzymes'
      WHEN 'B9' THEN 'Animal physiology'
      WHEN 'B10' THEN 'Ecosystems'
      WHEN 'B11' THEN 'Plant physiology'
      ELSE tag_code
    END;
  END IF;
  
  RETURN tag_code;
END;
$$ LANGUAGE plpgsql;

-- Create a function to map TMUA tag codes to text
CREATE OR REPLACE FUNCTION map_tmua_tag_to_text(tag_code text)
RETURNS text AS $$
BEGIN
  RETURN CASE tag_code
    -- Section 1, Part 1 (AS pure maths)
    WHEN 'MM1' THEN 'Algebra and functions'
    WHEN 'MM2' THEN 'Sequences and series'
    WHEN 'MM3' THEN 'Coordinate geometry in the (x, y)-plane'
    WHEN 'MM4' THEN 'Trigonometry'
    WHEN 'MM5' THEN 'Exponentials and logarithms'
    WHEN 'MM6' THEN 'Differentiation'
    WHEN 'MM7' THEN 'Integration'
    WHEN 'MM8' THEN 'Graphs of functions'
    -- Section 1, Part 2 (Higher GCSE)
    WHEN 'M1' THEN 'Units'
    WHEN 'M2' THEN 'Number'
    WHEN 'M3' THEN 'Ratio and proportion'
    WHEN 'M4' THEN 'Algebra'
    WHEN 'M5' THEN 'Geometry'
    WHEN 'M6' THEN 'Statistics'
    WHEN 'M7' THEN 'Probability'
    -- Section 2 - Logic of Arguments
    WHEN 'Arg1' THEN 'Propositional Logic'
    WHEN 'Arg2' THEN 'Necessary vs Sufficient'
    WHEN 'Arg3' THEN 'Quantifiers'
    WHEN 'Arg4' THEN 'Statement Negation'
    -- Section 2 - Mathematical Proof
    WHEN 'Prf1' THEN 'Proof Methods'
    WHEN 'Prf2' THEN 'Logical Implications'
    WHEN 'Prf3' THEN 'Conjecture Justification'
    WHEN 'Prf4' THEN 'Proof Ordering'
    WHEN 'Prf5' THEN 'Multi-step Reasoning'
    -- Section 2 - Identifying Errors in Proofs
    WHEN 'Err1' THEN 'Proof Error Spotting'
    WHEN 'Err2' THEN 'Invalid Inference Traps'
    ELSE tag_code
  END;
END;
$$ LANGUAGE plpgsql;

-- Helper function to determine ESAT paper_id from schema_id and paper column
CREATE OR REPLACE FUNCTION get_esat_paper_id(schema_id text, paper_val text)
RETURNS text AS $$
BEGIN
  IF schema_id LIKE 'M%' THEN
    IF paper_val = 'Math 1' THEN
      RETURN 'math1';
    ELSIF paper_val = 'Math 2' THEN
      RETURN 'math2';
    ELSE
      -- Default to math1 if paper is null
      RETURN 'math1';
    END IF;
  ELSIF schema_id LIKE 'P%' THEN
    RETURN 'physics';
  ELSIF schema_id LIKE 'C%' THEN
    RETURN 'chemistry';
  ELSIF schema_id LIKE 'B%' THEN
    RETURN 'biology';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update primary_tag for ESAT questions
UPDATE ai_generated_questions
SET primary_tag = map_esat_tag_to_text(
  primary_tag,
  get_esat_paper_id(schema_id, paper)
)
WHERE test_type = 'ESAT' 
  AND primary_tag IS NOT NULL
  AND primary_tag ~ '^[MCPB][0-9]+$|^MM[0-9]+$';

-- Update primary_tag for TMUA questions
UPDATE ai_generated_questions
SET primary_tag = map_tmua_tag_to_text(primary_tag)
WHERE test_type = 'TMUA' 
  AND primary_tag IS NOT NULL
  AND primary_tag ~ '^(MM|M|Arg|Prf|Err)[0-9]+$';

-- Update secondary_tags array for ESAT questions
UPDATE ai_generated_questions
SET secondary_tags = (
  SELECT jsonb_agg(
    map_esat_tag_to_text(
      tag_value::text,
      get_esat_paper_id(schema_id, paper)
    )
  )
  FROM jsonb_array_elements_text(secondary_tags) AS tag_value
)
WHERE test_type = 'ESAT' 
  AND secondary_tags IS NOT NULL
  AND jsonb_array_length(secondary_tags) > 0;

-- Update secondary_tags array for TMUA questions
UPDATE ai_generated_questions
SET secondary_tags = (
  SELECT jsonb_agg(map_tmua_tag_to_text(tag_value::text))
  FROM jsonb_array_elements_text(secondary_tags) AS tag_value
)
WHERE test_type = 'TMUA' 
  AND secondary_tags IS NOT NULL
  AND jsonb_array_length(secondary_tags) > 0;

-- Update tags_confidence JSONB keys for ESAT questions
-- This is more complex - we need to update the keys in the JSONB object
UPDATE ai_generated_questions
SET tags_confidence = (
  SELECT jsonb_object_agg(
    map_esat_tag_to_text(key, get_esat_paper_id(schema_id, paper)),
    value
  )
  FROM jsonb_each(tags_confidence)
)
WHERE test_type = 'ESAT' 
  AND tags_confidence IS NOT NULL
  AND jsonb_typeof(tags_confidence) = 'object';

-- Update tags_confidence JSONB keys for TMUA questions
UPDATE ai_generated_questions
SET tags_confidence = (
  SELECT jsonb_object_agg(
    map_tmua_tag_to_text(key),
    value
  )
  FROM jsonb_each(tags_confidence)
)
WHERE test_type = 'TMUA' 
  AND tags_confidence IS NOT NULL
  AND jsonb_typeof(tags_confidence) = 'object';

-- Clean up helper functions (optional - can keep them for future use)
-- DROP FUNCTION IF EXISTS map_esat_tag_to_text(text, text);
-- DROP FUNCTION IF EXISTS map_tmua_tag_to_text(text);
-- DROP FUNCTION IF EXISTS get_esat_paper_id(text, text);


