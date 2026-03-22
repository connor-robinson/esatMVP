# Database Management Scripts

## Clearing Test Data

To clear all test data and start fresh with real analytics:

1. **Start Supabase** (if not already running):
   ```bash
   npx supabase start
   ```

2. **Run the clear data script**:
   ```bash
   npx supabase db execute -f supabase/scripts/clear_test_data.sql
   ```

3. **Apply the new migration** (if it hasn't been applied yet):
   ```bash
   npx supabase db push
   ```

## Running Migrations

To apply all pending migrations:
```bash
npx supabase db push
```

To create a new migration:
```bash
npx supabase migration new migration_name
```

## Viewing Data

To open the Supabase Studio:
```bash
npx supabase studio
```

Then navigate to http://localhost:54323 in your browser.

## Checking Status

To check if Supabase is running:
```bash
npx supabase status
```

