-- Function to check if a variation is used in any sequence (across all users)
-- Uses SECURITY DEFINER to bypass RLS and check all sequences
-- Run this in your Supabase SQL editor AFTER running the main schema

-- First, create a helper function that checks if a JSONB item contains the variation
CREATE OR REPLACE FUNCTION item_contains_variation(item_json JSONB, variation_id_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  sub_item JSONB;
  override_record JSONB;
BEGIN
  -- Check if it's a pose_instance with matching variation
  IF (item_json->>'type') = 'pose_instance' THEN
    RETURN (item_json->>'poseVariationId') = variation_id_text;
  END IF;
  
  -- Check if it's a group_block
  IF (item_json->>'type') = 'group_block' THEN
    -- Check items array
    IF item_json ? 'items' AND jsonb_typeof(item_json->'items') = 'array' THEN
      FOR sub_item IN SELECT * FROM jsonb_array_elements(item_json->'items')
      LOOP
        IF item_contains_variation(sub_item, variation_id_text) THEN
          RETURN TRUE;
        END IF;
      END LOOP;
    END IF;
    
    -- Check roundOverrides
    IF item_json ? 'roundOverrides' AND jsonb_typeof(item_json->'roundOverrides') = 'array' THEN
      FOR override_record IN SELECT * FROM jsonb_array_elements(item_json->'roundOverrides')
      LOOP
        IF override_record ? 'items' AND jsonb_typeof(override_record->'items') = 'array' THEN
          FOR sub_item IN SELECT * FROM jsonb_array_elements(override_record->'items')
          LOOP
            IF item_contains_variation(sub_item, variation_id_text) THEN
              RETURN TRUE;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main function that checks all sequences
CREATE OR REPLACE FUNCTION check_variation_usage(p_variation_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  seq_record RECORD;
  section_item JSONB;
  item JSONB;
  found_names TEXT[] := '{}';
  variation_text TEXT := p_variation_id::TEXT;
  found_in_sequence BOOLEAN;
BEGIN
  FOR seq_record IN SELECT id, name, sections FROM sequences
  LOOP
    found_in_sequence := FALSE;
    
    -- Iterate through sections
    IF seq_record.sections IS NOT NULL AND jsonb_typeof(seq_record.sections) = 'array' THEN
      FOR section_item IN SELECT * FROM jsonb_array_elements(seq_record.sections)
      LOOP
        -- Check items in this section
        IF section_item ? 'items' AND jsonb_typeof(section_item->'items') = 'array' THEN
          FOR item IN SELECT * FROM jsonb_array_elements(section_item->'items')
          LOOP
            IF item_contains_variation(item, variation_text) THEN
              found_names := array_append(found_names, seq_record.name);
              found_in_sequence := TRUE;
              EXIT;
            END IF;
          END LOOP;
          IF found_in_sequence THEN
            EXIT;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN found_names;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
