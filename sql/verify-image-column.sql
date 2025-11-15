-- ============================================================================
-- VERIFY IMAGE_URL COLUMN EXISTS
-- ============================================================================
-- Run this in your Supabase SQL Editor to check if the image_url column exists
-- ============================================================================

-- Check if the column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pose_variations' 
  AND column_name = 'image_url';

-- If the above returns no rows, the column doesn't exist.
-- Run the migration: supabase-add-image-url-migration.sql

-- Check a sample variation to see if image_url is there
SELECT id, name, image_url 
FROM pose_variations 
LIMIT 5;

