-- Migration: Remove share_id dependency - make all sequences publicly accessible by UUID
-- Run this in your Supabase SQL Editor

-- Update RLS policy to allow public access to all sequences by UUID
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own sequences" ON sequences;

-- Recreate the policy to allow viewing own sequences OR any sequence (public access by UUID)
CREATE POLICY "Users can view their own sequences"
  ON sequences FOR SELECT
  USING (true);

-- Note: The share_id column can remain in the database for backward compatibility,
-- but it's no longer used by the application. All sequences are now shareable
-- by their UUID directly via /sequence/{uuid}

