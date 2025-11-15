-- ============================================================================
-- COMPLETE SUPABASE SETUP FOR YOGA SEQUENCE BUILDER
-- ============================================================================
-- This script will:
-- 1. Drop all existing tables, policies, triggers, and functions
-- 2. Recreate everything from scratch
-- 3. Set up Row Level Security (RLS) policies
-- 4. Create helper functions for permissions and admin access
-- 5. Create sample data
-- ============================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING OBJECTS (in correct order)
-- ============================================================================

-- Drop triggers first (including any auth-related triggers)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
DROP TRIGGER IF EXISTS update_poses_updated_at ON poses;
DROP TRIGGER IF EXISTS update_pose_variations_updated_at ON pose_variations;
DROP TRIGGER IF EXISTS update_sequences_updated_at ON sequences;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Drop functions (must drop dependent functions first)
DROP FUNCTION IF EXISTS public.get_all_users_for_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.has_permission(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.check_variation_usage(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile_on_signup() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop all policies (must be done before dropping tables)
DROP POLICY IF EXISTS "Everyone can view poses" ON poses;
DROP POLICY IF EXISTS "Everyone can insert poses" ON poses;
DROP POLICY IF EXISTS "Everyone can update poses" ON poses;
DROP POLICY IF EXISTS "Everyone can delete poses" ON poses;
DROP POLICY IF EXISTS "Everyone can view pose variations" ON pose_variations;
DROP POLICY IF EXISTS "Everyone can insert pose variations" ON pose_variations;
DROP POLICY IF EXISTS "Everyone can update pose variations" ON pose_variations;
DROP POLICY IF EXISTS "Everyone can delete pose variations" ON pose_variations;
DROP POLICY IF EXISTS "Users can view their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can insert their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can update their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can delete their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view profiles by share_id" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all user profiles" ON user_profiles;

-- Drop tables (in order of dependencies)
DROP TABLE IF EXISTS sequences CASCADE;
DROP TABLE IF EXISTS pose_variations CASCADE;
DROP TABLE IF EXISTS poses CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop indexes (they'll be dropped with tables, but being explicit)
DROP INDEX IF EXISTS idx_pose_variations_pose_id;
DROP INDEX IF EXISTS idx_sequences_name;
DROP INDEX IF EXISTS idx_sequences_user_id;
DROP INDEX IF EXISTS idx_sequences_share_id;
DROP INDEX IF EXISTS idx_poses_author_id;
DROP INDEX IF EXISTS idx_pose_variations_author_id;
DROP INDEX IF EXISTS idx_user_profiles_user_id;
DROP INDEX IF EXISTS idx_user_profiles_share_id;
DROP INDEX IF EXISTS idx_user_profiles_permissions;
DROP INDEX IF EXISTS idx_pose_variations_transitional_cues;

-- ============================================================================
-- STEP 2: CREATE TABLES
-- ============================================================================

-- Create user_profiles table (must be created first for foreign key references)
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  email TEXT NOT NULL,
  events JSONB DEFAULT '[]'::jsonb, -- Array of ClassEvent objects
  share_id TEXT UNIQUE, -- Custom shareable link (e.g., "yoga-instructor")
  permissions JSONB DEFAULT '{}'::jsonb, -- Feature-level permissions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create poses table
CREATE TABLE poses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pose_variations table
CREATE TABLE pose_variations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pose_id UUID NOT NULL REFERENCES poses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Cue columns
  cue_1 TEXT,
  cue_2 TEXT,
  cue_3 TEXT,
  breath_transition TEXT,
  -- Image support
  image_url TEXT,
  -- Transitional cues (JSONB array of 3 strings)
  transitional_cues JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pose_id, name),
  -- Constraint to ensure transitional_cues is empty or exactly 3 items
  CONSTRAINT check_transitional_cues_format 
    CHECK (
      jsonb_array_length(transitional_cues) = 0 OR 
      jsonb_array_length(transitional_cues) = 3
    )
);

-- Create sequences table
CREATE TABLE sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  share_id TEXT UNIQUE,  -- Unique token for public sharing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: CREATE INDEXES
-- ============================================================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_share_id ON user_profiles(share_id);
CREATE INDEX idx_user_profiles_permissions ON user_profiles USING GIN (permissions);

-- Poses indexes
CREATE INDEX idx_poses_author_id ON poses(author_id);

-- Pose variations indexes
CREATE INDEX idx_pose_variations_pose_id ON pose_variations(pose_id);
CREATE INDEX idx_pose_variations_author_id ON pose_variations(author_id);
CREATE INDEX idx_pose_variations_transitional_cues ON pose_variations USING GIN (transitional_cues);

-- Sequences indexes
CREATE INDEX idx_sequences_name ON sequences(name);
CREATE INDEX idx_sequences_user_id ON sequences(user_id);
CREATE INDEX idx_sequences_share_id ON sequences(share_id);

-- ============================================================================
-- STEP 4: CREATE FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, name, bio, events, share_id, permissions)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    '',
    '[]'::jsonb,
    NEW.id::text,
    '{}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a specific permission
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

-- Function to check if current user is admin (SECURITY DEFINER to avoid RLS recursion)
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

-- Function to get all users with emails for admin page
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
    COALESCE(au.email, up.email) as email,
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

-- Function to check if a variation is used in any sequence (across all users)
-- Uses SECURITY DEFINER to bypass RLS and check all sequences
CREATE OR REPLACE FUNCTION check_variation_usage(p_variation_id UUID)
RETURNS TABLE(sequence_names TEXT[]) AS $$
DECLARE
  seq_record RECORD;
  section_record JSONB;
  item_record JSONB;
  override_record JSONB;
  found_names TEXT[] := '{}';
  found_in_sequence BOOLEAN;
  
  -- Recursive helper to check items
  FUNCTION check_item(item JSONB) RETURNS BOOLEAN AS $$
  BEGIN
    IF (item->>'type') = 'pose_instance' THEN
      RETURN (item->>'poseVariationId') = p_variation_id::TEXT;
    ELSIF (item->>'type') = 'group_block' THEN
      -- Check items in group block
      IF item ? 'items' AND item->'items' IS NOT NULL THEN
        FOR item_record IN SELECT * FROM jsonb_array_elements(item->'items')
        LOOP
          IF check_item(item_record) THEN
            RETURN TRUE;
          END IF;
        END LOOP;
      END IF;
      -- Check round overrides
      IF item ? 'roundOverrides' AND item->'roundOverrides' IS NOT NULL THEN
        FOR override_record IN SELECT * FROM jsonb_array_elements(item->'roundOverrides')
        LOOP
          IF override_record ? 'items' AND override_record->'items' IS NOT NULL THEN
            FOR item_record IN SELECT * FROM jsonb_array_elements(override_record->'items')
            LOOP
              IF check_item(item_record) THEN
                RETURN TRUE;
              END IF;
            END LOOP;
          END IF;
        END LOOP;
      END IF;
    END IF;
    RETURN FALSE;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;
  
BEGIN
  FOR seq_record IN SELECT id, name, sections FROM sequences
  LOOP
    found_in_sequence := FALSE;
    IF seq_record.sections IS NOT NULL THEN
      FOR section_record IN SELECT * FROM jsonb_array_elements(seq_record.sections)
      LOOP
        IF section_record ? 'items' AND section_record->'items' IS NOT NULL THEN
          FOR item_record IN SELECT * FROM jsonb_array_elements(section_record->'items')
          LOOP
            IF check_item(item_record) THEN
              found_names := array_append(found_names, seq_record.name);
              found_in_sequence := TRUE;
              EXIT;
            END IF;
          END LOOP;
          IF found_in_sequence THEN
            EXIT;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT found_names;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: CREATE TRIGGERS
-- ============================================================================

-- Trigger to auto-create user profile on signup
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- Trigger for updated_at on user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on poses
CREATE TRIGGER update_poses_updated_at
  BEFORE UPDATE ON poses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on pose_variations
CREATE TRIGGER update_pose_variations_updated_at
  BEFORE UPDATE ON pose_variations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on sequences
CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE poses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pose_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================================================

-- ============================================================================
-- USER_PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone can view profiles by share_id (for public profiles)
CREATE POLICY "Anyone can view profiles by share_id"
  ON user_profiles FOR SELECT
  USING (share_id IS NOT NULL);

-- Admins can view all user profiles
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles FOR SELECT
  USING (is_admin());

-- Admins can update all user profiles (including permissions)
CREATE POLICY "Admins can update all user profiles"
  ON user_profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- POSES POLICIES
-- ============================================================================

-- Everyone can view poses
CREATE POLICY "Everyone can view poses"
  ON poses FOR SELECT
  USING (true);

-- Everyone can insert poses
CREATE POLICY "Everyone can insert poses"
  ON poses FOR INSERT
  WITH CHECK (true);

-- Everyone can update poses
CREATE POLICY "Everyone can update poses"
  ON poses FOR UPDATE
  USING (true);

-- Everyone can delete poses
CREATE POLICY "Everyone can delete poses"
  ON poses FOR DELETE
  USING (true);

-- ============================================================================
-- POSE_VARIATIONS POLICIES
-- ============================================================================

-- Everyone can view pose variations
CREATE POLICY "Everyone can view pose variations"
  ON pose_variations FOR SELECT
  USING (true);

-- Everyone can insert pose variations
CREATE POLICY "Everyone can insert pose variations"
  ON pose_variations FOR INSERT
  WITH CHECK (true);

-- Everyone can update pose variations
CREATE POLICY "Everyone can update pose variations"
  ON pose_variations FOR UPDATE
  USING (true);

-- Everyone can delete pose variations
CREATE POLICY "Everyone can delete pose variations"
  ON pose_variations FOR DELETE
  USING (true);

-- ============================================================================
-- SEQUENCES POLICIES
-- ============================================================================

-- All sequences are publicly viewable
CREATE POLICY "Users can view their own sequences"
  ON sequences FOR SELECT
  USING (true);

-- Users can insert their own sequences
CREATE POLICY "Users can insert their own sequences"
  ON sequences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sequences
CREATE POLICY "Users can update their own sequences"
  ON sequences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sequences
CREATE POLICY "Users can delete their own sequences"
  ON sequences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 8: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN user_profiles.permissions IS 'JSONB object storing feature-level permissions. Example: {"pose_library": true, "pose_management": true, "admin": false}';
COMMENT ON COLUMN poses.author_id IS 'User ID of the user who created this pose';
COMMENT ON COLUMN pose_variations.author_id IS 'User ID of the user who created this pose variation';
COMMENT ON COLUMN pose_variations.cue_1 IS 'First cue for the pose variation';
COMMENT ON COLUMN pose_variations.cue_2 IS 'Second cue for the pose variation';
COMMENT ON COLUMN pose_variations.cue_3 IS 'Third cue for the pose variation';
COMMENT ON COLUMN pose_variations.breath_transition IS 'Breath/Transition cue for the pose variation';
COMMENT ON COLUMN pose_variations.image_url IS 'URL to the image for this pose variation, stored in Supabase Storage bucket "pose-images"';
COMMENT ON COLUMN pose_variations.transitional_cues IS 'Array of 3 transitional cues (bottom-to-top) for guiding students into this pose variation. Each cue is a string describing body part movement from bottom to top.';

-- ============================================================================
-- STEP 9: INSERT SAMPLE DATA
-- ============================================================================

-- Insert sample poses
INSERT INTO poses (name) VALUES
  ('Downward Dog'),
  ('Warrior I'),
  ('Warrior II'),
  ('Tree Pose'),
  ('Child''s Pose'),
  ('Mountain Pose'),
  ('Forward Fold'),
  ('Cobra Pose'),
  ('Cat Pose'),
  ('Cow Pose')
ON CONFLICT (name) DO NOTHING;

-- Insert default variations for all poses
INSERT INTO pose_variations (pose_id, name, is_default)
SELECT p.id, 'Default', true
FROM poses p
WHERE p.name IN (
  'Downward Dog',
  'Warrior I',
  'Warrior II',
  'Tree Pose',
  'Child''s Pose',
  'Mountain Pose',
  'Forward Fold',
  'Cobra Pose',
  'Cat Pose',
  'Cow Pose'
)
ON CONFLICT (pose_id, name) DO NOTHING;

-- Insert additional sample variations
INSERT INTO pose_variations (pose_id, name, is_default)
SELECT p.id, 'Modified', false
FROM poses p
WHERE p.name IN ('Downward Dog', 'Warrior I')
ON CONFLICT (pose_id, name) DO NOTHING;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Your Supabase database is now ready to use.
-- Make sure to copy your Supabase URL and anon key to .env.local
-- 
-- Next steps:
-- 1. Grant permissions to users via the admin panel or SQL:
--    UPDATE user_profiles 
--    SET permissions = jsonb_set(
--      COALESCE(permissions, '{}'::jsonb),
--      '{pose_library}',
--      'true'::jsonb
--    )
--    WHERE user_id = 'USER_UUID_HERE';
--
-- 2. Set up Supabase Storage bucket "pose-images" for image uploads (optional)
-- 3. Configure environment variables in .env.local
-- ============================================================================
