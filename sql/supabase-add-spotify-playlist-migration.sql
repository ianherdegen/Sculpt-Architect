-- Migration: Add spotify_playlist_urls column to user_profiles table
-- Run this in your Supabase SQL Editor

-- Step 1: Add spotify_playlist_urls column if it doesn't exist (JSONB array of URLs)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS spotify_playlist_urls JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate data from old spotify_playlist_url column if it exists
DO $$
BEGIN
  -- Check if the old column exists and migrate data
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'spotify_playlist_url'
  ) THEN
    -- Migrate single URL to array format
    UPDATE user_profiles
    SET spotify_playlist_urls = CASE 
      WHEN spotify_playlist_url IS NOT NULL AND spotify_playlist_url != '' 
      THEN jsonb_build_array(spotify_playlist_url)
      ELSE '[]'::jsonb
    END
    WHERE spotify_playlist_urls = '[]'::jsonb 
    OR spotify_playlist_urls IS NULL;
    
    -- Drop the old column
    ALTER TABLE user_profiles DROP COLUMN IF EXISTS spotify_playlist_url;
  END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.spotify_playlist_urls IS 'Array of Spotify playlist URLs for the user profile';
