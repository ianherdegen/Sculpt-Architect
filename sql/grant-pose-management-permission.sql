-- ============================================================================
-- GRANT POSE_MANAGEMENT PERMISSION TO USER
-- ============================================================================
-- This script grants the pose_management permission to a specific user
-- ============================================================================

-- Grant pose_management permission to user
UPDATE user_profiles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{pose_management}',
  'true'::jsonb
)
WHERE user_id = 'a5502760-13df-454a-862f-78789213f6be'::uuid;

-- Verify the permission was granted
SELECT 
  user_id,
  email,
  permissions->>'pose_management' as pose_management,
  permissions->>'pose_library' as pose_library
FROM user_profiles
WHERE user_id = 'a5502760-13df-454a-862f-78789213f6be'::uuid;

-- ============================================================================
-- ALTERNATIVE: Grant multiple permissions at once
-- ============================================================================
-- If you want to grant both pose_library and pose_management:
--
-- UPDATE user_profiles 
-- SET permissions = jsonb_build_object(
--   'pose_library', true,
--   'pose_management', true
-- )
-- WHERE user_id = 'a5502760-13df-454a-862f-78789213f6be'::uuid;
-- ============================================================================

