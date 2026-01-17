-- ============================================================================
-- EXPORT: Complete Join of Poses and Pose Variations
-- ============================================================================
-- This query joins poses and pose_variations tables with all columns
-- including cues, image_url, and author information.
-- 
-- NOTE: transitional_cues column is optional. If you need it, run the migration:
-- sql/supabase-add-transitional-cues-migration.sql
-- Then use the query marked "WITH transitional_cues" below.
-- 
-- Useful for exporting or viewing all variations with their parent pose information.
-- ============================================================================

-- ============================================================================
-- MAIN QUERY: ALL Pose Variations with their Parent Poses
-- ============================================================================
-- IMPORTANT: This query returns ALL variations - with AND without images
-- Starts with pose_variations table and joins to poses
-- Each row represents one variation with its parent pose information
-- 
-- If you're only seeing variations with images, check:
-- 1. Are you running this exact query? (not the filtered one below)
-- 2. Are there filters applied in Supabase UI?
-- 3. Run the verification query below to check counts
-- ============================================================================

SELECT 
  -- Pose Variation columns (primary - we start here)
  pv.id as variation_id,
  pv.name as variation_name,
  pv.is_default,
  pv.author_id as variation_author_id,
  pv.image_url,
  pv.cue_1,
  pv.cue_2,
  pv.cue_3,
  pv.breath_transition,
  pv.created_at as variation_created_at,
  pv.updated_at as variation_updated_at,
  
  -- Pose columns (joined from poses table)
  p.id as pose_id,
  p.name as pose_name,
  p.author_id as pose_author_id,
  p.created_at as pose_created_at,
  p.updated_at as pose_updated_at
FROM pose_variations pv
INNER JOIN poses p ON pv.pose_id = p.id
-- EXPLICITLY NO WHERE CLAUSE - returns ALL variations
-- This includes variations with NULL image_url, with images, defaults, non-defaults
ORDER BY p.name, pv.is_default DESC, pv.name;

-- ============================================================================
-- VERIFICATION QUERY: Check counts to verify you're getting all variations
-- ============================================================================
-- Run this first to see how many variations exist total vs with images

-- SELECT 
--   COUNT(*) as total_variations,
--   COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as variations_with_images,
--   COUNT(CASE WHEN image_url IS NULL THEN 1 END) as variations_without_images,
--   COUNT(CASE WHEN is_default = true THEN 1 END) as default_variations,
--   COUNT(CASE WHEN is_default = false THEN 1 END) as non_default_variations
-- FROM pose_variations;

-- ============================================================================
-- Alternative: Formatted export with readable column names
-- ============================================================================
-- Starts with pose_variations, joins to poses
-- Returns ALL variations - defaults, non-defaults, with or without images

SELECT 
  pv.name as "Variation Name",
  pv.id as "Variation ID",
  CASE WHEN pv.is_default THEN 'Yes' ELSE 'No' END as "Is Default",
  pv.image_url as "Image URL",
  pv.cue_1 as "Cue 1",
  pv.cue_2 as "Cue 2",
  pv.cue_3 as "Cue 3",
  pv.breath_transition as "Breath Transition",
  pv.author_id as "Variation Author ID",
  pv.created_at as "Variation Created",
  pv.updated_at as "Variation Updated",
  p.name as "Pose Name",
  p.id as "Pose ID",
  p.author_id as "Pose Author ID",
  p.created_at as "Pose Created"
FROM pose_variations pv
INNER JOIN poses p ON pv.pose_id = p.id
-- No WHERE clause - returns ALL variations
ORDER BY p.name, pv.is_default DESC, pv.name;

-- ============================================================================
-- VERSION WITH transitional_cues (only use if column exists)
-- ============================================================================
-- Run migration first: sql/supabase-add-transitional-cues-migration.sql
-- Then uncomment and use this query:

-- SELECT 
--   -- Variation columns first (we start from variations)
--   pv.id as variation_id,
--   pv.name as variation_name,
--   pv.is_default,
--   pv.author_id as variation_author_id,
--   pv.image_url,
--   pv.cue_1,
--   pv.cue_2,
--   pv.cue_3,
--   pv.breath_transition,
--   pv.transitional_cues,
--   pv.created_at as variation_created_at,
--   pv.updated_at as variation_updated_at,
--   -- Pose columns (joined)
--   p.id as pose_id,
--   p.name as pose_name,
--   p.author_id as pose_author_id,
--   p.created_at as pose_created_at,
--   p.updated_at as pose_updated_at
-- FROM pose_variations pv
-- INNER JOIN poses p ON pv.pose_id = p.id
-- ORDER BY p.name, pv.is_default DESC, pv.name;

-- ============================================================================
-- Export as CSV format using COPY command (requires admin access)
-- ============================================================================
-- Run this in Supabase SQL Editor with admin privileges to export directly

-- COPY command for CSV export (exports ALL variations)
-- Starts from pose_variations, joins to poses
-- COPY (
--   SELECT 
--     pv.name as variation_name,
--     pv.id as variation_id,
--     pv.is_default,
--     pv.image_url,
--     pv.cue_1,
--     pv.cue_2,
--     pv.cue_3,
--     pv.breath_transition,
--     pv.author_id as variation_author_id,
--     pv.created_at as variation_created_at,
--     pv.updated_at as variation_updated_at,
--     p.name as pose_name,
--     p.id as pose_id,
--     p.author_id as pose_author_id,
--     p.created_at as pose_created_at
--   FROM pose_variations pv
--   INNER JOIN poses p ON pv.pose_id = p.id
--   -- No WHERE clause - exports ALL variations
--   ORDER BY p.name, pv.is_default DESC, pv.name
-- ) TO STDOUT WITH CSV HEADER;

-- ============================================================================
-- Export with transitional cues expanded (one row per cue)
-- ============================================================================
-- This query expands transitional_cues JSONB array into separate rows
-- Each variation with cues will appear multiple times (once per cue)
-- NOTE: Only works if transitional_cues column exists. Run migration first:
-- sql/supabase-add-transitional-cues-migration.sql

-- Check if column exists before running this query
-- SELECT 
--   p.name as pose_name,
--   p.id as pose_id,
--   pv.name as variation_name,
--   pv.id as variation_id,
--   pv.is_default,
--   cue.value::text as transitional_cue,
--   cue.ordinality as cue_number
-- FROM pose_variations pv
-- JOIN poses p ON p.id = pv.pose_id
-- LEFT JOIN LATERAL jsonb_array_elements_text(pv.transitional_cues) WITH ORDINALITY cue ON true
-- WHERE EXISTS (
--   SELECT 1 FROM information_schema.columns 
--   WHERE table_name = 'pose_variations' 
--   AND column_name = 'transitional_cues'
-- )
--   AND pv.transitional_cues IS NOT NULL 
--   AND jsonb_array_length(pv.transitional_cues) > 0
-- ORDER BY p.name, pv.is_default DESC, pv.name, cue.ordinality;

-- ============================================================================
-- VERSION: All Poses (including poses without variations)
-- ============================================================================
-- Use LEFT JOIN to show ALL poses, even if they have no variations
-- Variations will be NULL for poses without any variations

-- SELECT 
--   p.id as pose_id,
--   p.name as pose_name,
--   p.author_id as pose_author_id,
--   p.created_at as pose_created_at,
--   p.updated_at as pose_updated_at,
--   pv.id as variation_id,
--   pv.name as variation_name,
--   pv.is_default,
--   pv.author_id as variation_author_id,
--   pv.image_url,
--   pv.cue_1,
--   pv.cue_2,
--   pv.cue_3,
--   pv.breath_transition,
--   pv.created_at as variation_created_at,
--   pv.updated_at as variation_updated_at
-- FROM poses p
-- LEFT JOIN pose_variations pv ON p.id = pv.pose_id
-- ORDER BY p.name, pv.is_default DESC NULLS LAST, pv.name NULLS LAST;

-- ============================================================================
-- VERIFICATION: Count variations per pose
-- ============================================================================
-- Run this to verify you're getting all variations

-- SELECT 
--   p.name as pose_name,
--   COUNT(pv.id) as variation_count,
--   COUNT(CASE WHEN pv.is_default THEN 1 END) as default_count,
--   COUNT(CASE WHEN pv.image_url IS NOT NULL THEN 1 END) as variations_with_images
-- FROM poses p
-- LEFT JOIN pose_variations pv ON p.id = pv.pose_id
-- GROUP BY p.id, p.name
-- ORDER BY p.name;

-- ============================================================================
-- FILTERED QUERIES - DO NOT USE IF YOU WANT ALL VARIATIONS
-- ============================================================================
-- WARNING: These queries have WHERE clauses that filter results
-- Only use if you specifically need filtered data
-- ============================================================================

-- Export only variations with images (FILTERED - excludes variations without images)
-- ⚠️ WARNING: This will NOT return all variations - only those with image_url set
-- Starts from pose_variations, filters to only those with images
SELECT 
  pv.name as variation_name,
  pv.image_url,
  pv.cue_1,
  pv.cue_2,
  pv.cue_3,
  pv.breath_transition,
  p.name as pose_name
FROM pose_variations pv
INNER JOIN poses p ON pv.pose_id = p.id
WHERE pv.image_url IS NOT NULL
ORDER BY p.name, pv.name;

-- ============================================================================
-- Export only variations with transitional cues
-- ============================================================================
-- NOTE: Only works if transitional_cues column exists. Run migration first:
-- sql/supabase-add-transitional-cues-migration.sql

-- SELECT 
--   p.name as pose_name,
--   pv.name as variation_name,
--   pv.transitional_cues,
--   pv.cue_1,
--   pv.cue_2,
--   pv.cue_3
-- FROM pose_variations pv
-- JOIN poses p ON p.id = pv.pose_id
-- WHERE EXISTS (
--   SELECT 1 FROM information_schema.columns 
--   WHERE table_name = 'pose_variations' 
--   AND column_name = 'transitional_cues'
-- )
--   AND pv.transitional_cues IS NOT NULL 
--   AND jsonb_array_length(pv.transitional_cues) > 0
-- ORDER BY p.name, pv.name;

