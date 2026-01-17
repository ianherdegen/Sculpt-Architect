-- Migration: Add profile_photo_url and is_banned columns to user_profiles table
-- Run this in your Supabase SQL Editor

-- Add profile_photo_url column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Add is_banned column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Create index on is_banned for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_banned ON user_profiles(is_banned) 
WHERE is_banned = true;

-- Add comments to document the columns
COMMENT ON COLUMN user_profiles.profile_photo_url IS 'URL to the user profile photo stored in Supabase Storage';
COMMENT ON COLUMN user_profiles.is_banned IS 'Whether the user is banned (prevents login and disables public profile)';
