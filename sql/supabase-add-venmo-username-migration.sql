-- Migration: Add venmo_username column to user_profiles table
-- Run this in your Supabase SQL Editor

-- Add venmo_username column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS venmo_username TEXT;

-- Create index on venmo_username for faster lookups (optional but useful)
CREATE INDEX IF NOT EXISTS idx_user_profiles_venmo_username ON user_profiles(venmo_username) 
WHERE venmo_username IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.venmo_username IS 'Venmo username for generating payment links on public profiles';
