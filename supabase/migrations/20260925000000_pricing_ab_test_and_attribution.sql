-- Pricing A/B test variants and attribution tracking

-- Table to store pricing variant assignments
CREATE TABLE IF NOT EXISTS pricing_variant_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id text,
  variant text NOT NULL CHECK (variant IN ('3day_original', '3day_discounted', 'nodeal_original', 'nodeal_discounted')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  source text, -- 'cookie' or 'account'
  CONSTRAINT unique_user_variant UNIQUE (user_id),
  CONSTRAINT unique_anon_variant UNIQUE (anon_id),
  CONSTRAINT require_user_or_anon CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);

CREATE INDEX idx_pricing_variant_user ON pricing_variant_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_pricing_variant_anon ON pricing_variant_assignments(anon_id) WHERE anon_id IS NOT NULL;
CREATE INDEX idx_pricing_variant_assigned_at ON pricing_variant_assignments(assigned_at);

-- Table to track pricing page views with variant context
CREATE TABLE IF NOT EXISTS pricing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id text,
  variant text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  landing_page text,
  session_duration_ms integer,
  CONSTRAINT require_user_or_anon_view CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);

CREATE INDEX idx_pricing_views_user ON pricing_views(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_pricing_views_anon ON pricing_views(anon_id) WHERE anon_id IS NOT NULL;
CREATE INDEX idx_pricing_views_variant ON pricing_views(variant);
CREATE INDEX idx_pricing_views_viewed_at ON pricing_views(viewed_at);
CREATE INDEX idx_pricing_views_utm_source ON pricing_views(utm_source) WHERE utm_source IS NOT NULL;

-- Table to track checkout starts (button clicks)
CREATE TABLE IF NOT EXISTS checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id text,
  variant text NOT NULL,
  plan_type text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  checkout_session_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  CONSTRAINT require_user_or_anon_attempt CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);

CREATE INDEX idx_checkout_attempts_user ON checkout_attempts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_checkout_attempts_anon ON checkout_attempts(anon_id) WHERE anon_id IS NOT NULL;
CREATE INDEX idx_checkout_attempts_variant ON checkout_attempts(variant);
CREATE INDEX idx_checkout_attempts_plan ON checkout_attempts(plan_type);
CREATE INDEX idx_checkout_attempts_session ON checkout_attempts(checkout_session_id) WHERE checkout_session_id IS NOT NULL;

-- Table to track successful purchases with variant
CREATE TABLE IF NOT EXISTS purchase_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant text NOT NULL,
  plan_type text NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  subscription_id text,
  checkout_session_id text,
  amount_gbp numeric(10,2),
  discount_applied boolean DEFAULT false,
  discount_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  days_to_convert integer -- Days from first visit to purchase
);

CREATE INDEX idx_purchase_conversions_user ON purchase_conversions(user_id);
CREATE INDEX idx_purchase_conversions_variant ON purchase_conversions(variant);
CREATE INDEX idx_purchase_conversions_plan ON purchase_conversions(plan_type);
CREATE INDEX idx_purchase_conversions_purchased_at ON purchase_conversions(purchased_at);
CREATE INDEX idx_purchase_conversions_utm_source ON purchase_conversions(utm_source) WHERE utm_source IS NOT NULL;

-- Enhanced user journey tracking
CREATE TABLE IF NOT EXISTS user_attribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id text,
  first_visit_at timestamptz NOT NULL DEFAULT now(),
  first_landing_page text,
  first_referrer text,
  first_utm_source text,
  first_utm_medium text,
  first_utm_campaign text,
  first_utm_content text,
  first_utm_term text,
  first_gclid text,
  signup_at timestamptz,
  first_purchase_at timestamptz,
  total_visits integer DEFAULT 1,
  CONSTRAINT unique_user_attribution UNIQUE (user_id),
  CONSTRAINT unique_anon_attribution UNIQUE (anon_id),
  CONSTRAINT require_user_or_anon_attr CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);

CREATE INDEX idx_user_attribution_user ON user_attribution(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_attribution_anon ON user_attribution(anon_id) WHERE anon_id IS NOT NULL;
CREATE INDEX idx_user_attribution_first_visit ON user_attribution(first_visit_at);
CREATE INDEX idx_user_attribution_utm_source ON user_attribution(first_utm_source) WHERE first_utm_source IS NOT NULL;

-- Admin analytics view for conversion funnel
CREATE OR REPLACE VIEW pricing_conversion_funnel AS
WITH variant_stats AS (
  SELECT 
    variant,
    COUNT(DISTINCT COALESCE(user_id::text, anon_id)) as unique_viewers,
    COUNT(*) as total_views
  FROM pricing_views
  WHERE viewed_at > now() - interval '90 days'
  GROUP BY variant
),
attempt_stats AS (
  SELECT 
    variant,
    COUNT(DISTINCT COALESCE(user_id::text, anon_id)) as unique_attempters,
    COUNT(*) as total_attempts
  FROM checkout_attempts
  WHERE attempted_at > now() - interval '90 days'
  GROUP BY variant
),
purchase_stats AS (
  SELECT 
    variant,
    COUNT(DISTINCT user_id) as unique_purchasers,
    COUNT(*) as total_purchases,
    AVG(amount_gbp) as avg_purchase_amount,
    SUM(amount_gbp) as total_revenue
  FROM purchase_conversions
  WHERE purchased_at > now() - interval '90 days'
  GROUP BY variant
)
SELECT 
  v.variant,
  v.unique_viewers,
  v.total_views,
  COALESCE(a.unique_attempters, 0) as unique_attempters,
  COALESCE(a.total_attempts, 0) as total_attempts,
  COALESCE(p.unique_purchasers, 0) as unique_purchasers,
  COALESCE(p.total_purchases, 0) as total_purchases,
  COALESCE(p.avg_purchase_amount, 0) as avg_purchase_amount,
  COALESCE(p.total_revenue, 0) as total_revenue,
  ROUND(100.0 * COALESCE(a.unique_attempters, 0) / NULLIF(v.unique_viewers, 0), 2) as view_to_attempt_rate,
  ROUND(100.0 * COALESCE(p.unique_purchasers, 0) / NULLIF(a.unique_attempters, 0), 2) as attempt_to_purchase_rate,
  ROUND(100.0 * COALESCE(p.unique_purchasers, 0) / NULLIF(v.unique_viewers, 0), 2) as overall_conversion_rate
FROM variant_stats v
LEFT JOIN attempt_stats a ON v.variant = a.variant
LEFT JOIN purchase_stats p ON v.variant = p.variant
ORDER BY v.variant;

-- Admin view for attribution sources
CREATE OR REPLACE VIEW attribution_sources_summary AS
SELECT 
  first_utm_source,
  first_utm_medium,
  first_utm_campaign,
  COUNT(*) as total_users,
  COUNT(signup_at) as signups,
  COUNT(first_purchase_at) as purchases,
  ROUND(100.0 * COUNT(signup_at) / NULLIF(COUNT(*), 0), 2) as signup_rate,
  ROUND(100.0 * COUNT(first_purchase_at) / NULLIF(COUNT(signup_at), 0), 2) as purchase_rate
FROM user_attribution
WHERE first_visit_at > now() - interval '90 days'
GROUP BY first_utm_source, first_utm_medium, first_utm_campaign
ORDER BY total_users DESC;

-- Function to get or assign variant
CREATE OR REPLACE FUNCTION get_or_assign_pricing_variant(
  p_user_id uuid DEFAULT NULL,
  p_anon_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_variant text;
  v_random float;
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
  
  -- Assign new variant (equal distribution)
  v_random := random();
  v_variant := CASE 
    WHEN v_random < 0.25 THEN '3day_original'
    WHEN v_random < 0.50 THEN '3day_discounted'
    WHEN v_random < 0.75 THEN 'nodeal_original'
    ELSE 'nodeal_discounted'
  END;
  
  -- Insert assignment
  INSERT INTO pricing_variant_assignments (user_id, anon_id, variant, source)
  VALUES (p_user_id, p_anon_id, v_variant, CASE WHEN p_user_id IS NOT NULL THEN 'account' ELSE 'cookie' END)
  ON CONFLICT (user_id) DO NOTHING
  ON CONFLICT (anon_id) DO NOTHING;
  
  RETURN v_variant;
END;
$$;

-- Function to upsert user attribution (first-touch)
CREATE OR REPLACE FUNCTION upsert_user_attribution(
  p_user_id uuid DEFAULT NULL,
  p_anon_id text DEFAULT NULL,
  p_landing_page text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL,
  p_utm_term text DEFAULT NULL,
  p_gclid text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Try to insert new attribution record
  INSERT INTO user_attribution (
    user_id,
    anon_id,
    first_landing_page,
    first_referrer,
    first_utm_source,
    first_utm_medium,
    first_utm_campaign,
    first_utm_content,
    first_utm_term,
    first_gclid,
    total_visits
  ) VALUES (
    p_user_id,
    p_anon_id,
    p_landing_page,
    p_referrer,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_utm_content,
    p_utm_term,
    p_gclid,
    1
  )
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE
  SET total_visits = user_attribution.total_visits + 1
  ON CONFLICT (anon_id) WHERE anon_id IS NOT NULL DO UPDATE
  SET total_visits = user_attribution.total_visits + 1;
END;
$$;

-- RLS policies
ALTER TABLE pricing_variant_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attribution ENABLE ROW LEVEL SECURITY;

-- Users can read their own variant
CREATE POLICY "Users can read own variant"
  ON pricing_variant_assignments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own pricing views
CREATE POLICY "Users can read own pricing views"
  ON pricing_views FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own checkout attempts
CREATE POLICY "Users can read own checkout attempts"
  ON checkout_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own purchases
CREATE POLICY "Users can read own purchases"
  ON purchase_conversions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own attribution
CREATE POLICY "Users can read own attribution"
  ON user_attribution FOR SELECT
  USING (auth.uid() = user_id);

-- Grant admin access (assuming admin role exists)
GRANT ALL ON pricing_variant_assignments TO authenticated;
GRANT ALL ON pricing_views TO authenticated;
GRANT ALL ON checkout_attempts TO authenticated;
GRANT ALL ON purchase_conversions TO authenticated;
GRANT ALL ON user_attribution TO authenticated;

-- Comments
COMMENT ON TABLE pricing_variant_assignments IS 'Stores A/B test variant assignments for pricing experiments';
COMMENT ON TABLE pricing_views IS 'Tracks pricing page views with variant and attribution data';
COMMENT ON TABLE checkout_attempts IS 'Tracks checkout button clicks and session starts';
COMMENT ON TABLE purchase_conversions IS 'Tracks successful purchases with variant data';
COMMENT ON TABLE user_attribution IS 'Tracks user journey from first visit to conversion';
COMMENT ON VIEW pricing_conversion_funnel IS 'Admin view of conversion rates by pricing variant';
COMMENT ON VIEW attribution_sources_summary IS 'Admin view of user acquisition sources and conversion rates';
