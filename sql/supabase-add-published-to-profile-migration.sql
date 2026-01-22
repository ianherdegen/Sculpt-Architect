-- Migration: Add published_to_profile column to sequences table
-- Run this in your Supabase SQL Editor

-- Add published_to_profile column if it doesn't exist
ALTER TABLE sequences 
ADD COLUMN IF NOT EXISTS published_to_profile BOOLEAN DEFAULT false;

-- Create index on published_to_profile for faster queries
CREATE INDEX IF NOT EXISTS idx_sequences_published_to_profile ON sequences(published_to_profile) 
WHERE published_to_profile = true;

-- Add comment to document the column
COMMENT ON COLUMN sequences.published_to_profile IS 'Whether this sequence is published to the user profile (visible on public profile page)';
