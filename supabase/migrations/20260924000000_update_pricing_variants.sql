-- Update pricing A/B test to use new variant names: control and express_deal
-- Replaces the old 4-variant test with a simpler 2-variant test

-- Update the variant check constraint
ALTER TABLE pricing_variant_assignments 
DROP CONSTRAINT IF EXISTS pricing_variant_assignments_variant_check;

ALTER TABLE pricing_variant_assignments 
ADD CONSTRAINT pricing_variant_assignments_variant_check 
CHECK (variant IN ('control', 'express_deal'));

-- Migrate existing data (if any) to new variants
-- Old variants map to new ones based on trial/price structure
UPDATE pricing_variant_assignments 
SET variant = 'control' 
WHERE variant IN ('3day_original', 'nodeal_original');

UPDATE pricing_variant_assignments 
SET variant = 'express_deal' 
WHERE variant IN ('3day_discounted', 'nodeal_discounted');

-- Update pricing_views
UPDATE pricing_views 
SET variant = 'control' 
WHERE variant IN ('3day_original', 'nodeal_original');

UPDATE pricing_views 
SET variant = 'express_deal' 
WHERE variant IN ('3day_discounted', 'nodeal_discounted');

-- Update checkout_attempts
UPDATE checkout_attempts 
SET variant = 'control' 
WHERE variant IN ('3day_original', 'nodeal_original');

UPDATE checkout_attempts 
SET variant = 'express_deal' 
WHERE variant IN ('3day_discounted', 'nodeal_discounted');

-- Update purchase_conversions
UPDATE purchase_conversions 
SET variant = 'control' 
WHERE variant IN ('3day_original', 'nodeal_original');

UPDATE purchase_conversions 
SET variant = 'express_deal' 
WHERE variant IN ('3day_discounted', 'nodeal_discounted');

-- Update the variant assignment function to use new variants
CREATE OR REPLACE FUNCTION get_or_assign_pricing_variant(
  p_user_id uuid DEFAULT NULL,
  p_anon_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_variant text;
BEGIN
  -- Check if user already has a variant
  IF p_user_id IS NOT NULL THEN
    SELECT variant INTO v_variant
    FROM pricing_variant_assignments
    WHERE user_id = p_user_id
    LIMIT 1;
    
    IF v_variant IS NOT NULL THEN
      RETURN v_variant;
    END IF;
  END IF;
  
  -- Check anon_id
  IF p_anon_id IS NOT NULL THEN
    SELECT variant INTO v_variant
    FROM pricing_variant_assignments
    WHERE anon_id = p_anon_id
    LIMIT 1;
    
    IF v_variant IS NOT NULL THEN
      RETURN v_variant;
    END IF;
  END IF;
  
  -- Assign new variant (50/50 split between control and express_deal)
  v_variant := CASE 
    WHEN random() < 0.5 THEN 'control'
    ELSE 'express_deal'
  END;
  
  -- Insert assignment
  INSERT INTO pricing_variant_assignments (user_id, anon_id, variant, source)
  VALUES (p_user_id, p_anon_id, v_variant, CASE WHEN p_user_id IS NOT NULL THEN 'account' ELSE 'cookie' END)
  ON CONFLICT (user_id) DO NOTHING
  ON CONFLICT (anon_id) DO NOTHING;
  
  RETURN v_variant;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_or_assign_pricing_variant IS 'Assigns and retrieves pricing variant for A/B testing (control vs express_deal)';
