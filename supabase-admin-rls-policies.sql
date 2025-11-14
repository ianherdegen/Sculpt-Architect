-- ============================================================================
-- ADMIN RLS POLICIES FOR USER_PROFILES
-- ============================================================================
-- This script adds RLS policies to allow admins to read and update all user profiles
-- Run this after granting admin permissions to users
-- ============================================================================

-- Create a SECURITY DEFINER function to check if current user is admin
-- This avoids infinite recursion by using SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (permissions->>'admin')::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all users with emails for admin page
-- This joins auth.users with user_profiles to get emails
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  name TEXT,
  bio TEXT,
  permissions JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if current user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin permission required.';
  END IF;

  -- Return all users with email from auth.users
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    COALESCE(au.email, up.email) as email, -- Use auth.users email if available, fallback to user_profiles email
    up.name,
    up.bio,
    COALESCE(up.permissions, '{}'::jsonb) as permissions,
    up.created_at,
    up.updated_at
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.user_id = au.id
  ORDER BY COALESCE(au.email, up.email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all user profiles" ON user_profiles;

-- Policy: Admins can view all user profiles
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles FOR SELECT
  USING (is_admin());

-- Policy: Admins can update all user profiles (including permissions)
CREATE POLICY "Admins can update all user profiles"
  ON user_profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- To verify the policies are working, run this query as an admin user:
-- SELECT * FROM user_profiles;
-- 
-- You should be able to see all user profiles.
-- ============================================================================

