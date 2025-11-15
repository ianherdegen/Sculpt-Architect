-- Migration: Add cue columns and breath/transition to pose_variations table
-- Run this in your Supabase SQL Editor

-- Add cue columns to pose_variations table
ALTER TABLE pose_variations
ADD COLUMN IF NOT EXISTS cue_1 TEXT,
ADD COLUMN IF NOT EXISTS cue_2 TEXT,
ADD COLUMN IF NOT EXISTS cue_3 TEXT,
ADD COLUMN IF NOT EXISTS breath_transition TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN pose_variations.cue_1 IS 'First cue for the pose variation';
COMMENT ON COLUMN pose_variations.cue_2 IS 'Second cue for the pose variation';
COMMENT ON COLUMN pose_variations.cue_3 IS 'Third cue for the pose variation';
COMMENT ON COLUMN pose_variations.breath_transition IS 'Breath/Transition cue for the pose variation';

