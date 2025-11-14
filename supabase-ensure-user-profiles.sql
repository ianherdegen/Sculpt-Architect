-- ============================================================================
-- ENSURE ALL USERS HAVE USER_PROFILES
-- ============================================================================
-- This script creates user_profiles for any authenticated users who don't
-- already have one. Run this periodically or after user signups to ensure
-- all users have profiles.
-- ============================================================================

-- Create user_profiles for users who don't have one
-- Note: If you haven't run the permissions migration yet, remove 'permissions' from the column list
INSERT INTO user_profiles (user_id, email, name, bio, events, share_id, permissions)
SELECT 
  au.id as user_id,
  au.email as email,
  '' as name,
  '' as bio,
  '[]'::jsonb as events,
  au.id::text as share_id, -- Default to user ID as share_id
  '{}'::jsonb as permissions -- Default empty permissions (requires permissions column)
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL
  AND au.email IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Alternative version without permissions column (use this if permissions column doesn't exist yet):
-- INSERT INTO user_profiles (user_id, email, name, bio, events, share_id)
-- SELECT 
--   au.id as user_id,
--   au.email as email,
--   '' as name,
--   '' as bio,
--   '[]'::jsonb as events,
--   au.id::text as share_id
-- FROM auth.users au
-- LEFT JOIN user_profiles up ON au.id = up.user_id
-- WHERE up.id IS NULL
--   AND au.email IS NOT NULL
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to see which users don't have profiles (should return 0 rows):
-- 
-- SELECT au.id, au.email
-- FROM auth.users au
-- LEFT JOIN user_profiles up ON au.id = up.user_id
-- WHERE up.id IS NULL
--   AND au.email IS NOT NULL;
-- ============================================================================

-- ============================================================================
-- ALTERNATIVE: Create a trigger to auto-create profiles on user signup
-- ============================================================================
-- Uncomment the following to automatically create profiles when users sign up:
--
-- CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO user_profiles (user_id, email, name, bio, events, share_id, permissions)
--   VALUES (
--     NEW.id,
--     NEW.email,
--     '',
--     '',
--     '[]'::jsonb,
--     NEW.id::text,
--     '{}'::jsonb
--   )
--   ON CONFLICT (user_id) DO NOTHING;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
-- CREATE TRIGGER on_auth_user_created_create_profile
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION create_user_profile_on_signup();
-- ============================================================================

