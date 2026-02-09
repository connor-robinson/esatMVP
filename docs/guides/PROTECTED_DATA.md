# Protected Data Documentation

This document lists all tables and storage buckets that are protected from deletion and modification.

## Protected Tables

The following tables contain data and are protected by database triggers that prevent DELETE and UPDATE operations:

| Table Name | Row Count | Protection Type | Date Protected |
|------------|-----------|----------------|----------------|
| `conversion_rows` | 2,474 | DELETE + UPDATE | 2025-01-27 |
| `questions` | 1,926 | DELETE + UPDATE | 2025-01-27 |
| `papers` | 48 | DELETE + UPDATE | 2025-01-27 |
| `conversion_tables` | 35 | DELETE + UPDATE | 2025-01-27 |
| `profiles` | 1 | DELETE + UPDATE | 2025-01-27 |

## Protection Mechanism

Database triggers have been created that will:
- **Prevent DELETE operations**: Any attempt to delete rows from these tables will raise an exception
- **Prevent UPDATE operations**: Any attempt to update rows in these tables will raise an exception

### Trigger Functions
- `prevent_protected_table_delete()` - Blocks DELETE operations
- `prevent_protected_table_update()` - Blocks UPDATE operations

### To Temporarily Disable Protection

If you need to modify protected data (use with extreme caution):

```sql
-- Disable triggers temporarily (example for questions table)
ALTER TABLE questions DISABLE TRIGGER protect_questions_delete;
ALTER TABLE questions DISABLE TRIGGER protect_questions_update;

-- Re-enable after modifications
ALTER TABLE questions ENABLE TRIGGER protect_questions_delete;
ALTER TABLE questions ENABLE TRIGGER protect_questions_update;
```

## Protected Storage Buckets

The following storage buckets contain images and should NOT be deleted:

| Bucket Name | Type | Status |
|-------------|------|--------|
| `question-images` | Public | Protected |

**Note**: Storage bucket protection is enforced through application-level policies. Always verify before deleting any files from these buckets.

## Important Notes

1. **INSERT operations are still allowed** - New data can be added to these tables
2. **SELECT operations are unaffected** - Reading data is always allowed
3. **Foreign key constraints** - Deleting related data in other tables may still be restricted by foreign key constraints
4. **Storage protection** - Storage bucket deletion must be prevented manually through Supabase dashboard or CLI policies

## Migration History

- **2025-01-27**: Initial protection setup via migration `protect_data_tables_from_deletion`

