-- Migration: Add is_default column to pose_variations table
-- Run this in your Supabase SQL Editor if you already have existing data

-- Add the is_default column
ALTER TABLE pose_variations 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Update existing variations to set the first variation of each pose as default
WITH first_variations AS (
  SELECT DISTINCT ON (pose_id) 
    id, pose_id
  FROM pose_variations 
  ORDER BY pose_id, created_at ASC
)
UPDATE pose_variations 
SET is_default = true 
WHERE id IN (SELECT id FROM first_variations);

-- Ensure only one default variation per pose
-- This constraint will be enforced by the application logic
-- since we can't easily add a unique constraint on a partial index in this migration
