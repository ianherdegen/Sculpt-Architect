# Database Cleanup Safety Guide

## ⚠️ IMPORTANT: Read This Before Running Any Cleanup Scripts

### Step-by-Step Safe Workflow

#### Step 1: Create a Backup First
```sql
-- Run this FIRST to create a backup
\i sql/BACKUP-BEFORE-CLEANUP.sql
```

Or manually:
```sql
CREATE TABLE sequences_backup_20250207 AS SELECT * FROM sequences;
```

#### Step 2: Run in DRY RUN Mode
```sql
-- This will show you what WOULD be changed without actually changing anything
-- Set dry_run = true (default)
\set dry_run true
\i sql/cleanup-item-substitutes-safe.sql
```

Review the output carefully:
- Check which sequences would be affected
- Verify the number of invalid substitutes being removed
- Look at the "Before" and "After" columns to see what's changing

#### Step 3: Test on a Single Sequence First (Optional but Recommended)
```sql
-- Test on just one sequence to verify behavior
BEGIN;

-- Create a test function that only processes one sequence
CREATE OR REPLACE FUNCTION cleanup_one_sequence(p_sequence_id UUID)
RETURNS TABLE(...) AS $$
  -- Similar logic but filtered to WHERE id = p_sequence_id
$$ LANGUAGE plpgsql;

-- Test on a specific sequence
SELECT * FROM cleanup_one_sequence('your-sequence-id-here');

-- Review results, then:
ROLLBACK; -- If something looks wrong
-- OR
COMMIT;   -- If it looks good
```

#### Step 4: Run the Full Cleanup (If Dry Run Looked Good)
```sql
-- Set dry_run = false to actually apply changes
\set dry_run false
\i sql/cleanup-item-substitutes-safe.sql
```

#### Step 5: Review and Commit or Rollback
After running with `dry_run = false`:
- Review the output again
- Check a few sequences in your app to verify they still work correctly
- If everything looks good: `COMMIT;`
- If something looks wrong: `ROLLBACK;`

### Safety Features in the Script

1. **Transaction Wrapper**: Everything runs in a transaction, so you can rollback
2. **Dry Run Mode**: Preview changes before applying them
3. **Detailed Reporting**: See exactly what will be changed
4. **Before/After Comparison**: See the actual data before and after

### What Gets Cleaned

The script ONLY removes `itemSubstitutes` that are:
- ❌ Missing `itemIndex` or `round` values
- ❌ Have `itemIndex` pointing to non-existent items (out of bounds)
- ❌ Have `round` numbers outside the valid range (1 to sets count)

**Valid substitutes are NEVER touched.**

### If Something Goes Wrong

1. **Don't panic** - everything is in a transaction
2. **Run `ROLLBACK;`** immediately to undo all changes
3. **Restore from backup** if needed:
   ```sql
   UPDATE sequences s
   SET sections = b.sections
   FROM sequences_backup_20250207 b
   WHERE s.id = b.id;
   ```

### Best Practices

1. ✅ Always backup first
2. ✅ Always run in dry-run mode first
3. ✅ Review output carefully
4. ✅ Test on a small subset if possible
5. ✅ Verify in the app after cleanup
6. ✅ Keep the backup table for a few days

### Red Flags to Watch For

- ⚠️ If the script reports removing MORE substitutes than expected
- ⚠️ If sequences you know are valid show up in the cleanup report
- ⚠️ If the "Before" column shows valid-looking substitutes that would be removed

If you see any red flags, **DO NOT COMMIT**. Investigate first.

### Questions to Ask Yourself Before Committing

1. Does the number of removed substitutes make sense?
2. Are the sequences that would be affected ones I expected?
3. Do the "Before" entries look invalid (out of bounds, NULL values)?
4. Have I tested this in the app to verify sequences still work?

### Need Help?

If you're unsure about anything:
1. Don't commit the transaction
2. Take screenshots of the output
3. Ask for help reviewing the changes
4. You can always run `ROLLBACK;` and try again later
