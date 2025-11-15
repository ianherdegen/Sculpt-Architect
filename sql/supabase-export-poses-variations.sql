-- ============================================================================
-- EXPORT: Poses and Pose Variations Merged
-- ============================================================================
-- This query joins poses and pose_variations tables to show the pose name
-- for each variation. Useful for exporting or viewing all variations with
-- their parent pose information.
-- ============================================================================

-- Basic join query - shows pose name with each variation
SELECT 
  pv.id as variation_id,
  p.id as pose_id,
  p.name as pose_name,
  pv.name as variation_name,
  pv.is_default,
  pv.created_at as variation_created_at,
  pv.updated_at as variation_updated_at,
  p.created_at as pose_created_at
FROM pose_variations pv
JOIN poses p ON p.id = pv.pose_id
ORDER BY p.name, pv.is_default DESC, pv.name;

-- ============================================================================
-- Alternative: Export with all columns formatted nicely
-- ============================================================================

SELECT 
  p.name as "Pose Name",
  pv.name as "Variation Name",
  CASE WHEN pv.is_default THEN 'Yes' ELSE 'No' END as "Is Default",
  pv.id as "Variation ID",
  p.id as "Pose ID",
  pv.created_at as "Variation Created",
  pv.updated_at as "Variation Updated"
FROM pose_variations pv
JOIN poses p ON p.id = pv.pose_id
ORDER BY p.name, pv.is_default DESC, pv.name;

-- ============================================================================
-- Export as CSV format (for copy/paste)
-- ============================================================================

-- To export as CSV in Supabase:
-- 1. Run the query above
-- 2. Click the download/export button in the results view
-- 3. Or use COPY command (requires admin access):
-- 
-- COPY (
--   SELECT 
--     p.name,
--     pv.name,
--     pv.is_default
--   FROM pose_variations pv
--   JOIN poses p ON p.id = pv.pose_id
--   ORDER BY p.name, pv.is_default DESC, pv.name
-- ) TO STDOUT WITH CSV HEADER;

-- ============================================================================
-- Export with transitional cues expanded (one row per cue)
-- ============================================================================
-- NOTE: This query requires the transitional_cues column to exist.
-- Uncomment and use only after running the migration:
-- supabase-add-transitional-cues-migration.sql
--
-- SELECT 
--   p.name as pose_name,
--   pv.name as variation_name,
--   pv.is_default,
--   cue.value::text as transitional_cue,
--   cue.ordinality as cue_number
-- FROM pose_variations pv
-- JOIN poses p ON p.id = pv.pose_id
-- LEFT JOIN LATERAL jsonb_array_elements_text(pv.transitional_cues) WITH ORDINALITY cue ON true
-- WHERE pv.transitional_cues IS NOT NULL 
--   AND jsonb_array_length(pv.transitional_cues) > 0
-- ORDER BY p.name, pv.is_default DESC, pv.name, cue.ordinality;

