# Fixing "Failed to load funnel data" Error

## Problem
The admin conversion analytics page shows "Failed to load funnel data" because:
1. The database tables were created with old variant names (`3day_original`, `3day_discounted`, etc.)
2. The code was updated to use new variant names (`control`, `express_deal`)
3. The database views are working but returning no data because no records exist with the new variant names

## Solution

### Step 1: Run the Migration
A new migration file has been created and pushed: `supabase/migrations/20260924000000_update_pricing_variants.sql`

**You need to run this migration on your Supabase database:**

```bash
# If using Supabase CLI locally
supabase db reset

# OR apply the specific migration via Supabase dashboard
# Go to Database > Migrations and run the migration
```

### Step 2: What the Migration Does

1. **Updates the constraint** to accept new variant names (`control`, `express_deal`)
2. **Migrates existing data** from old variants to new ones:
   - `3day_original` → `control`
   - `nodeal_original` → `control`
   - `3day_discounted` → `express_deal`
   - `nodeal_discounted` → `express_deal`
3. **Updates all tables**: 
   - `pricing_variant_assignments`
   - `pricing_views`
   - `checkout_attempts`
   - `purchase_conversions`
4. **Updates the function** `get_or_assign_pricing_variant` to use 50/50 split between `control` and `express_deal`

### Step 3: Verify the Fix

After running the migration:

1. Visit `/admin/conversion-analytics`
2. You should see:
   - Two variants: `control` and `express_deal`
   - Conversion funnel data (may be empty if no one has visited yet)
   - Attribution sources
   - No "Failed to load funnel data" error

### Why This Happened

The original migration was created with a 4-variant A/B test design, but then the code was updated to use a simpler 2-variant design (Control vs ESAT Rush). The database schema wasn't updated to match the code changes until now.

### If You Still See Errors

If you still see "Failed to load funnel data" after running the migration:

1. **Check if the views exist**:
   ```sql
   SELECT * FROM pricing_conversion_funnel;
   SELECT * FROM attribution_sources_summary;
   ```

2. **Check if there's any data**:
   ```sql
   SELECT variant, COUNT(*) FROM pricing_views GROUP BY variant;
   SELECT variant, COUNT(*) FROM checkout_attempts GROUP BY variant;
   SELECT variant, COUNT(*) FROM purchase_conversions GROUP BY variant;
   ```

3. **If tables are empty**, that's normal! New visitors will populate the data. The error should no longer appear, you'll just see empty/zero values.

## Summary

✅ **Migration created**: `20260924000000_update_pricing_variants.sql`
✅ **Code updated**: Already using `control` and `express_deal`
⚠️ **Action required**: Run the migration on your Supabase database

After running the migration, the conversion analytics page will work correctly!
