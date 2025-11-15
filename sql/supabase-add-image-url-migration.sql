-- ============================================================================
-- ADD IMAGE_URL COLUMN TO POSE_VARIATIONS TABLE
-- ============================================================================
-- This migration adds support for images on pose variations
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add image_url column to pose_variations table
ALTER TABLE pose_variations 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN pose_variations.image_url IS 'URL to the image for this pose variation, stored in Supabase Storage bucket "pose-images"';

