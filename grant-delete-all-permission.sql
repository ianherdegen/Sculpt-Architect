-- Grant delete_all permission to a user
-- This permission allows users to delete any pose or variation, regardless of ownership
-- Note: Other rules still apply (e.g., cannot delete default variations, cannot delete if in sequences)
-- Replace 'USER_ID_HERE' with the actual user ID

UPDATE user_profiles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{delete_all}',
  'true'::jsonb
)
WHERE user_id = 'USER_ID_HERE'::uuid;

-- Example: Grant delete_all permission to user a5502760-13df-454a-862f-78789213f6be
-- UPDATE user_profiles 
-- SET permissions = jsonb_set(
--   COALESCE(permissions, '{}'::jsonb),
--   '{delete_all}',
--   'true'::jsonb
-- )
-- WHERE user_id = 'a5502760-13df-454a-862f-78789213f6be'::uuid;

-- Verify the permission was granted
SELECT 
  user_id,
  email,
  permissions->>'pose_library' as pose_library,
  permissions->>'pose_management' as pose_management,
  permissions->>'update_all' as update_all,
  permissions->>'delete_all' as delete_all,
  permissions->>'admin' as admin
FROM user_profiles
WHERE user_id = 'USER_ID_HERE'::uuid;

