-- ============================================================================
-- COMPLETE SUPABASE SETUP FOR YOGA SEQUENCE BUILDER
-- ============================================================================
-- This script will:
-- 1. Drop all existing tables, policies, triggers, and functions
-- 2. Recreate everything from scratch
-- 3. Set up Row Level Security (RLS) policies
-- 4. Create sample data
-- ============================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING OBJECTS (in correct order)
-- ============================================================================

-- Drop triggers first (including any auth-related triggers)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_poses_updated_at ON poses;
DROP TRIGGER IF EXISTS update_pose_variations_updated_at ON pose_variations;
DROP TRIGGER IF EXISTS update_sequences_updated_at ON sequences;

-- Drop functions
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
DROP POLICY IF EXISTS "Everyone can view sequences" ON sequences;
DROP POLICY IF EXISTS "Everyone can insert sequences" ON sequences;
DROP POLICY IF EXISTS "Everyone can update sequences" ON sequences;
DROP POLICY IF EXISTS "Everyone can delete sequences" ON sequences;

-- Drop any remaining policies
DROP POLICY IF EXISTS "Only admins can insert poses" ON poses;
DROP POLICY IF EXISTS "Only admins can update poses" ON poses;
DROP POLICY IF EXISTS "Only admins can delete poses" ON poses;
DROP POLICY IF EXISTS "Only admins can insert pose variations" ON pose_variations;
DROP POLICY IF EXISTS "Only admins can update pose variations" ON pose_variations;
DROP POLICY IF EXISTS "Only admins can delete pose variations" ON pose_variations;
DROP POLICY IF EXISTS "Users can view their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can insert their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can update their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can delete their own sequences" ON sequences;

-- Drop tables (in order of dependencies)
DROP TABLE IF EXISTS sequences CASCADE;
DROP TABLE IF EXISTS pose_variations CASCADE;
DROP TABLE IF EXISTS poses CASCADE;

-- Drop indexes (they'll be dropped with tables, but being explicit)
DROP INDEX IF EXISTS idx_pose_variations_pose_id;
DROP INDEX IF EXISTS idx_sequences_name;
DROP INDEX IF EXISTS idx_sequences_user_id;

-- ============================================================================
-- STEP 2: CREATE TABLES
-- ============================================================================

-- Create poses table
CREATE TABLE poses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pose_variations table
CREATE TABLE pose_variations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pose_id UUID NOT NULL REFERENCES poses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pose_id, name)
);

-- Create sequences table
CREATE TABLE sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_pose_variations_pose_id ON pose_variations(pose_id);
CREATE INDEX idx_sequences_name ON sequences(name);
CREATE INDEX idx_sequences_user_id ON sequences(user_id);

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
  
  RETURN QUERY SELECT fnound_names;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: CREATE TRIGGERS
-- ============================================================================

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

ALTER TABLE poses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pose_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================================================

-- Poses: Everyone can read and modify
CREATE POLICY "Everyone can view poses"
  ON poses FOR SELECT
  USING (true);

CREATE POLICY "Everyone can insert poses"
  ON poses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Everyone can update poses"
  ON poses FOR UPDATE
  USING (true);

CREATE POLICY "Everyone can delete poses"
  ON poses FOR DELETE
  USING (true);

-- Pose Variations: Everyone can read and modify
CREATE POLICY "Everyone can view pose variations"
  ON pose_variations FOR SELECT
  USING (true);

CREATE POLICY "Everyone can insert pose variations"
  ON pose_variations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Everyone can update pose variations"
  ON pose_variations FOR UPDATE
  USING (true);

CREATE POLICY "Everyone can delete pose variations"
  ON pose_variations FOR DELETE
  USING (true);

-- Sequences: Users can only see and modify their own sequences
CREATE POLICY "Users can view their own sequences"
  ON sequences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sequences"
  ON sequences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sequences"
  ON sequences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sequences"
  ON sequences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 8: INSERT SAMPLE DATA
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
-- ============================================================================
