-- ============================================================================
-- USER PROFILES TABLE SETUP
-- ============================================================================
-- This script adds user profile functionality to the Supabase database
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Drop existing table and policies if they exist
-- Note: Dropping the table CASCADE will automatically drop all policies
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  email TEXT NOT NULL,
  events JSONB DEFAULT '[]'::jsonb, -- Array of ClassEvent objects
  share_id TEXT UNIQUE, -- Custom shareable link (e.g., "yoga-instructor")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_share_id ON user_profiles(share_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

