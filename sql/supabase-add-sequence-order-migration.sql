-- Migration: Add display_order column to sequences table
-- Run this in your Supabase SQL Editor

-- Add display_order column if it doesn't exist
ALTER TABLE sequences 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index on display_order for faster sorting
CREATE INDEX IF NOT EXISTS idx_sequences_display_order ON sequences(display_order);

-- Set display_order for existing sequences based on their name (alphabetical order)
-- This ensures existing sequences have a proper order
-- Only update sequences where display_order is NULL or 0 (unset)
UPDATE sequences
SET display_order = subquery.row_number - 1
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY COALESCE(display_order, 0), name) as row_number
  FROM sequences
) AS subquery
WHERE sequences.id = subquery.id 
  AND (sequences.display_order IS NULL OR sequences.display_order = 0);

-- Make display_order NOT NULL after setting values
ALTER TABLE sequences
ALTER COLUMN display_order SET NOT NULL;

