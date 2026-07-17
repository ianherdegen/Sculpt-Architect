-- ============================================================================
-- CLEANUP SCRIPT: Fix itemSubstitutes in existing sequences
-- ============================================================================
-- This script cleans up itemSubstitutes arrays in group blocks that may have:
-- 1. Invalid itemIndex values (pointing to non-existent items)
-- 2. Out-of-bounds indices
-- 3. Invalid round numbers (outside the sets count)
-- 4. Orphaned substitutes from deleted items
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_item_substitutes()
RETURNS TABLE(
  sequence_id UUID,
  sequence_name TEXT,
  cleaned_count INTEGER,
  removed_count INTEGER
) AS $$
DECLARE
  seq_record RECORD;
  section_record JSONB;
  item_record JSONB;
  updated_sections JSONB;
  updated_section JSONB;
  updated_item JSONB;
  updated_items JSONB;
  updated_substitutes JSONB;
  substitute_record JSONB;
  item_index INTEGER;
  round_num INTEGER;
  items_count INTEGER;
  sets_count INTEGER;
  cleaned INTEGER;
  removed INTEGER;
  total_cleaned INTEGER := 0;
  total_removed INTEGER := 0;
  has_changes BOOLEAN;
  before_count INTEGER;
  after_count INTEGER;
  
  -- Recursive function to clean a single group block
  FUNCTION clean_single_group_block(group_block JSONB) RETURNS JSONB AS $$
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
  
BEGIN
  -- Iterate through all sequences
  FOR seq_record IN SELECT id, name, sections FROM sequences
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
          
          IF item_record ? 'itemSubstitutes' 
             AND item_record->'itemSubstitutes' IS NOT NULL THEN
            before_count := jsonb_array_length(item_record->'itemSubstitutes');
          END IF;
          
          -- Use recursive function to clean group block (handles nesting)
          updated_item := clean_single_group_block(item_record);
          
          -- Count substitutes after cleaning
          IF updated_item ? 'itemSubstitutes' 
             AND updated_item->'itemSubstitutes' IS NOT NULL THEN
            after_count := jsonb_array_length(updated_item->'itemSubstitutes');
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
      UPDATE sequences
      SET sections = updated_sections,
          updated_at = NOW()
      WHERE id = seq_record.id;
      
      total_cleaned := total_cleaned + cleaned;
      total_removed := total_removed + removed;
      
      -- Return information about this sequence
      RETURN QUERY SELECT 
        seq_record.id,
        seq_record.name,
        cleaned,
        removed;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Run the cleanup function and show results
SELECT * FROM cleanup_item_substitutes();

-- Optional: Drop the function after use (uncomment if desired)
-- DROP FUNCTION IF EXISTS cleanup_item_substitutes();
