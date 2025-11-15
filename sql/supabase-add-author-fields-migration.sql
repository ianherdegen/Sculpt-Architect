-- ============================================================================
-- ADD AUTHOR FIELDS TO POSES AND POSE_VARIATIONS
-- ============================================================================
-- This script adds author tracking to poses and pose_variations tables
-- ============================================================================

-- Add author field to poses table
ALTER TABLE poses 
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add author field to pose_variations table
ALTER TABLE pose_variations 
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for efficient author queries
CREATE INDEX IF NOT EXISTS idx_poses_author_id ON poses(author_id);
CREATE INDEX IF NOT EXISTS idx_pose_variations_author_id ON pose_variations(author_id);

-- Add comments
COMMENT ON COLUMN poses.author_id IS 'User ID of the user who created this pose';
COMMENT ON COLUMN pose_variations.author_id IS 'User ID of the user who created this pose variation';

-- ============================================================================
-- SET DEFAULT AUTHOR FOR EXISTING POSES AND VARIANTS
-- ============================================================================
-- Set all existing poses to the specified user
UPDATE poses 
SET author_id = 'a5502760-13df-454a-862f-78789213f6be'::uuid
WHERE author_id IS NULL;

-- Set all existing pose_variations to the specified user
UPDATE pose_variations 
SET author_id = 'a5502760-13df-454a-862f-78789213f6be'::uuid
WHERE author_id IS NULL;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================

