-- ============================================================================
-- PERMISSIONS SYSTEM MIGRATION
-- ============================================================================
-- This script adds a scalable permissions system to user_profiles
-- Permissions are stored as JSONB for flexibility and scalability
-- ============================================================================

-- Add permissions column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Create index on permissions for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_permissions ON user_profiles USING GIN (permissions);

-- Add comment explaining the permissions structure
COMMENT ON COLUMN user_profiles.permissions IS 'JSONB object storing feature-level permissions. Example: {"pose_library": true, "admin": false}';

-- ============================================================================
-- HELPER FUNCTION: Check if user has a specific permission
-- ============================================================================
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_permissions JSONB;
BEGIN
  SELECT permissions INTO v_permissions
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  -- Return false if user profile doesn't exist
  IF v_permissions IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the permission exists and is true
  RETURN COALESCE((v_permissions->>p_permission_key)::boolean, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS TO EXISTING USERS (OPTIONAL)
-- ============================================================================
-- Uncomment and modify as needed to grant initial permissions
-- UPDATE user_profiles 
-- SET permissions = jsonb_set(
--   COALESCE(permissions, '{}'::jsonb),
--   '{pose_library}',
--   'true'::jsonb
-- )
-- WHERE user_id IN (
--   -- Add user IDs here
-- );

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- To grant pose_library access to a user:
-- UPDATE user_profiles 
-- SET permissions = jsonb_set(
--   COALESCE(permissions, '{}'::jsonb),
--   '{pose_library}',
--   'true'::jsonb
-- )
-- WHERE user_id = 'USER_UUID_HERE';
-- ============================================================================

