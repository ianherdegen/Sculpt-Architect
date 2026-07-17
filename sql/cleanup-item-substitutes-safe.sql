-- ============================================================================
-- SAFE CLEANUP SCRIPT: Fix itemSubstitutes in existing sequences
-- ============================================================================
-- SAFETY FEATURES:
-- 1. DRY RUN MODE: Change dry_run parameter below to preview changes
-- 2. TRANSACTION WRAPPER: Wraps everything in a transaction you can rollback
-- 3. DETAILED REPORTING: Shows exactly what will be changed
--
-- RECOMMENDED WORKFLOW:
-- Step 1: Run with dry_run = true first to see what would change
-- Step 2: Review the output carefully
-- Step 3: If satisfied, change dry_run = false and run again
-- Step 4: Review results, then COMMIT or ROLLBACK the transaction
-- ============================================================================

BEGIN; -- Start transaction - can ROLLBACK if something goes wrong

-- Helper function to clean a single group block (defined separately)
CREATE OR REPLACE FUNCTION clean_single_group_block(group_block JSONB) 
RETURNS JSONB AS $$
DECLARE
  cleaned_block JSONB;
  cleaned_items JSONB;
  cleaned_substitutes JSONB;
  sub_item JSONB;
  sub_record JSONB;
  items_count INTEGER;
  sets_count INTEGER;
  item_idx INTEGER;
  round_idx INTEGER;
BEGIN
  cleaned_block := group_block;
  
  -- Get sets count (default to 1 if missing)
  IF group_block ? 'sets' THEN
    sets_count := (group_block->>'sets')::INTEGER;
  ELSE
    sets_count := 1;
  END IF;
  
  -- Get items count
  IF group_block ? 'items' AND group_block->'items' IS NOT NULL THEN
    items_count := jsonb_array_length(group_block->'items');
  ELSE
    items_count := 0;
  END IF;
  
  -- Clean up itemSubstitutes
  IF group_block ? 'itemSubstitutes' 
     AND group_block->'itemSubstitutes' IS NOT NULL
     AND jsonb_array_length(group_block->'itemSubstitutes') > 0 THEN
    
    cleaned_substitutes := jsonb_build_array();
    
    FOR sub_record IN SELECT * FROM jsonb_array_elements(group_block->'itemSubstitutes')
    LOOP
      -- Validate itemIndex and round
      item_idx := (sub_record->>'itemIndex')::INTEGER;
      round_idx := (sub_record->>'round')::INTEGER;
      
      -- Check if valid
      IF item_idx IS NOT NULL 
         AND round_idx IS NOT NULL
         AND item_idx >= 0 
         AND item_idx < items_count
         AND round_idx >= 1 
         AND round_idx <= sets_count THEN
        -- Valid substitute, keep it
        cleaned_substitutes := cleaned_substitutes || jsonb_build_array(sub_record);
      END IF;
      -- Invalid substitutes are simply not added (removed)
    END LOOP;
    
    -- Only update if we removed some substitutes
    IF jsonb_array_length(group_block->'itemSubstitutes') > jsonb_array_length(cleaned_substitutes) THEN
      cleaned_block := jsonb_set(
        cleaned_block,
        '{itemSubstitutes}',
        cleaned_substitutes
      );
    END IF;
  END IF;
  
  -- Recursively clean nested group blocks
  IF items_count > 0 THEN
    cleaned_items := jsonb_build_array();
    
    FOR sub_item IN SELECT * FROM jsonb_array_elements(group_block->'items')
    LOOP
      IF (sub_item->>'type') = 'group_block' THEN
        -- Recursively clean nested group block
        cleaned_items := cleaned_items || jsonb_build_array(clean_single_group_block(sub_item));
      ELSE
        -- Keep non-group-block items as-is
        cleaned_items := cleaned_items || jsonb_build_array(sub_item);
      END IF;
    END LOOP;
    
    cleaned_block := jsonb_set(
      cleaned_block,
      '{items}',
      cleaned_items
    );
  END IF;
  
  RETURN cleaned_block;
END;
$$ LANGUAGE plpgsql;

-- Main cleanup function
CREATE OR REPLACE FUNCTION cleanup_item_substitutes_safe(p_dry_run BOOLEAN DEFAULT true)
RETURNS TABLE(
  sequence_id UUID,
  sequence_name TEXT,
  cleaned_count INTEGER,
  removed_count INTEGER,
  would_update BOOLEAN,
  before_substitutes JSONB,
  after_substitutes JSONB
) AS $$
DECLARE
  seq_record RECORD;
  section_record JSONB;
  item_record JSONB;
  updated_sections JSONB;
  updated_section JSONB;
  updated_item JSONB;
  updated_items JSONB;
  cleaned INTEGER;
  removed INTEGER;
  has_changes BOOLEAN;
  before_count INTEGER;
  after_count INTEGER;
  before_subs JSONB;
  after_subs JSONB;
BEGIN
  -- Iterate through all sequences
  FOR seq_record IN SELECT id, name, sections FROM sequences ORDER BY name
  LOOP
    cleaned := 0;
    removed := 0;
    has_changes := FALSE;
    updated_sections := jsonb_build_array();
    
    -- Process each section
    FOR section_record IN SELECT * FROM jsonb_array_elements(seq_record.sections)
    LOOP
      updated_section := section_record;
      updated_items := jsonb_build_array();
      
      -- Process each item in the section
      FOR item_record IN SELECT * FROM jsonb_array_elements(section_record->'items')
      LOOP
        -- Check if this is a group block
        IF (item_record->>'type') = 'group_block' THEN
          -- Count substitutes before cleaning
          before_count := 0;
          after_count := 0;
          before_subs := NULL;
          after_subs := NULL;
          
          IF item_record ? 'itemSubstitutes' 
             AND item_record->'itemSubstitutes' IS NOT NULL THEN
            before_count := jsonb_array_length(item_record->'itemSubstitutes');
            before_subs := item_record->'itemSubstitutes';
          END IF;
          
          -- Use helper function to clean group block (handles nesting)
          updated_item := clean_single_group_block(item_record);
          
          -- Count substitutes after cleaning
          IF updated_item ? 'itemSubstitutes' 
             AND updated_item->'itemSubstitutes' IS NOT NULL THEN
            after_count := jsonb_array_length(updated_item->'itemSubstitutes');
            after_subs := updated_item->'itemSubstitutes';
          END IF;
          
          -- Track changes
          IF before_count > after_count THEN
            removed := removed + (before_count - after_count);
            cleaned := cleaned + 1;
            has_changes := TRUE;
          END IF;
        ELSE
          updated_item := item_record;
        END IF;
        
        -- Add the (possibly updated) item to the section
        updated_items := updated_items || jsonb_build_array(updated_item);
      END LOOP;
      
      -- Update the section with cleaned items
      updated_section := jsonb_set(
        updated_section,
        '{items}',
        updated_items
      );
      
      -- Add the updated section
      updated_sections := updated_sections || jsonb_build_array(updated_section);
    END LOOP;
    
    -- Update the sequence if there were changes
    IF has_changes THEN
      IF NOT p_dry_run THEN
        -- Actually update the database
        UPDATE sequences
        SET sections = updated_sections,
            updated_at = NOW()
        WHERE id = seq_record.id;
      END IF;
      
      -- Return information about this sequence
      RETURN QUERY SELECT 
        seq_record.id,
        seq_record.name,
        cleaned,
        removed,
        TRUE, -- would_update
        before_subs,
        after_subs;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION: Check if any sequences have itemSubstitutes at all
-- ============================================================================
-- This helps verify the cleanup script is working correctly
SELECT 
  'Total sequences' as "Check",
  COUNT(*) as "Count"
FROM sequences
UNION ALL
SELECT 
  'Sequences with group blocks',
  COUNT(DISTINCT s.id)
FROM sequences s,
     jsonb_array_elements(s.sections) AS section,
     jsonb_array_elements(section->'items') AS item
WHERE item->>'type' = 'group_block'
UNION ALL
SELECT 
  'Group blocks with itemSubstitutes',
  COUNT(*)
FROM sequences s,
     jsonb_array_elements(s.sections) AS section,
     jsonb_array_elements(section->'items') AS item
WHERE item->>'type' = 'group_block'
  AND item ? 'itemSubstitutes'
  AND item->'itemSubstitutes' IS NOT NULL
  AND jsonb_array_length(item->'itemSubstitutes') > 0;

-- ============================================================================
-- DETAILED DIAGNOSTIC: Show all itemSubstitutes and mark invalid ones
-- ============================================================================
-- This shows every substitute and whether it's valid or invalid
SELECT 
  s.name as "Sequence Name",
  s.id as "Sequence ID",
  (item->>'sets')::INTEGER as "Group Sets",
  jsonb_array_length(COALESCE(item->'items', '[]'::jsonb)) as "Items Count",
  sub->>'round' as "Round",
  sub->>'itemIndex' as "Item Index",
  CASE 
    WHEN sub->>'itemIndex' IS NULL THEN '❌ INVALID: Missing itemIndex'
    WHEN sub->>'round' IS NULL THEN '❌ INVALID: Missing round'
    WHEN (sub->>'itemIndex')::INTEGER < 0 THEN '❌ INVALID: itemIndex < 0'
    WHEN (sub->>'itemIndex')::INTEGER >= jsonb_array_length(COALESCE(item->'items', '[]'::jsonb)) THEN 
      '❌ INVALID: itemIndex out of bounds (>= items count)'
    WHEN (sub->>'round')::INTEGER < 1 THEN '❌ INVALID: round < 1'
    WHEN (sub->>'round')::INTEGER > COALESCE((item->>'sets')::INTEGER, 1) THEN 
      '❌ INVALID: round > sets count'
    ELSE '✅ VALID'
  END as "Status",
  sub->'substituteItem'->>'poseVariationId' as "Substitute Pose Variation ID"
FROM sequences s,
     jsonb_array_elements(s.sections) AS section,
     jsonb_array_elements(section->'items') AS item,
     jsonb_array_elements(item->'itemSubstitutes') AS sub
WHERE item->>'type' = 'group_block'
  AND item ? 'itemSubstitutes'
  AND item->'itemSubstitutes' IS NOT NULL
  AND jsonb_array_length(item->'itemSubstitutes') > 0
ORDER BY 
  s.name,
  CASE 
    WHEN sub->>'itemIndex' IS NULL THEN 1
    WHEN sub->>'round' IS NULL THEN 1
    WHEN (sub->>'itemIndex')::INTEGER < 0 THEN 1
    WHEN (sub->>'itemIndex')::INTEGER >= jsonb_array_length(COALESCE(item->'items', '[]'::jsonb)) THEN 1
    WHEN (sub->>'round')::INTEGER < 1 THEN 1
    WHEN (sub->>'round')::INTEGER > COALESCE((item->>'sets')::INTEGER, 1) THEN 1
    ELSE 2
  END,
  (sub->>'round')::INTEGER,
  (sub->>'itemIndex')::INTEGER;

-- ============================================================================
-- STEP 1: DRY RUN - Preview what would change (default)
-- ============================================================================
-- This shows what WOULD be changed without actually changing anything
-- Review the output carefully before proceeding to Step 2
-- 
-- If this returns no rows, it means there are no invalid itemSubstitutes to clean!
SELECT 
  sequence_id,
  sequence_name,
  cleaned_count as "Group Blocks Cleaned",
  removed_count as "Invalid Substitutes Removed",
  would_update as "Would Update",
  'DRY RUN - No changes made' as "Status"
FROM cleanup_item_substitutes_safe(true)  -- true = dry run mode
ORDER BY sequence_name;

-- ============================================================================
-- STEP 2: APPLY CHANGES (only after reviewing Step 1 output)
-- ============================================================================
-- Uncomment the lines below ONLY after reviewing the dry run output above
-- and confirming everything looks correct
--
-- SELECT 
--   sequence_id,
--   sequence_name,
--   cleaned_count as "Group Blocks Cleaned",
--   removed_count as "Invalid Substitutes Removed",
--   would_update as "Updated",
--   'CHANGES APPLIED' as "Status"
-- FROM cleanup_item_substitutes_safe(false)  -- false = apply changes
-- ORDER BY sequence_name;
--
-- ============================================================================

-- IMPORTANT: Review the output above before committing!
-- 
-- To rollback (undo changes):
--   ROLLBACK;
--
-- To commit (save changes):
--   COMMIT;
--
-- Don't commit yet - review the output first!
