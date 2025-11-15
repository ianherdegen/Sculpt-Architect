-- ============================================================================
-- MIGRATION: Add transitional_cues to pose_variations table
-- ============================================================================
-- This migration adds a JSONB column to store 3 bottom-to-top transitional
-- cues for each pose variation. These cues help instructors guide students
-- into the pose from a previous position.
-- ============================================================================

-- Add the transitional_cues column as JSONB array
ALTER TABLE pose_variations 
ADD COLUMN IF NOT EXISTS transitional_cues JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN pose_variations.transitional_cues IS 
'Array of 3 transitional cues (bottom-to-top) for guiding students into this pose variation. Each cue is a string describing body part movement from bottom to top.';

-- Create an index for efficient querying (optional, but useful if filtering by cues)
CREATE INDEX IF NOT EXISTS idx_pose_variations_transitional_cues 
ON pose_variations USING GIN (transitional_cues);

-- Add a check constraint to ensure we always have exactly 3 cues (or empty array)
-- This constraint allows empty array or exactly 3 cues
ALTER TABLE pose_variations
ADD CONSTRAINT check_transitional_cues_format 
CHECK (
  jsonb_array_length(transitional_cues) = 0 OR 
  jsonb_array_length(transitional_cues) = 3
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- After running this migration, use the generate-transitional-cues.ts script
-- to populate existing pose variations with AI-generated cues.
-- ============================================================================




