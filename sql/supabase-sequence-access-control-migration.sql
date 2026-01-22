-- Migration: Update RLS policy for sequences to restrict public access
-- Only owners can view their own sequences, others can only view published sequences
-- Run this in your Supabase SQL Editor

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own sequences" ON sequences;

-- Create new policy: Users can view their own sequences OR published sequences
CREATE POLICY "Users can view their own sequences"
  ON sequences FOR SELECT
  USING (
    auth.uid() = user_id OR 
    published_to_profile = true
  );
