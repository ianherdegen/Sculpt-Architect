-- Migration: Add share_id column to sequences table
-- Run this in your Supabase SQL Editor

-- Add share_id column if it doesn't exist
ALTER TABLE sequences 
ADD COLUMN IF NOT EXISTS share_id TEXT UNIQUE;

-- Create index on share_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sequences_share_id ON sequences(share_id);

-- Update RLS policy to allow public access to sequences with share_id
-- First, drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own sequences" ON sequences;

-- Recreate the policy to allow viewing own sequences OR sequences with share_id
CREATE POLICY "Users can view their own sequences"
  ON sequences FOR SELECT
  USING (auth.uid() = user_id OR share_id IS NOT NULL);

