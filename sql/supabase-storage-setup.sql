-- ============================================================================
-- SUPABASE STORAGE SETUP FOR POSE IMAGES
-- ============================================================================
-- This script sets up a storage bucket for pose variation images
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Create the storage bucket for pose images
-- Note: You may need to create the bucket manually in the Supabase Dashboard
-- Go to Storage > New bucket, name it 'pose-images', make it public
-- 
-- If you get RLS errors, the bucket might not exist. Create it manually first, then run the policies below.

-- Try to create the bucket (this might fail due to RLS - if so, create manually)
DO $$
BEGIN
  -- Try to insert the bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'pose-images',
    'pose-images',
    true, -- Public bucket so images can be accessed without auth
    5242880, -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot create bucket due to permissions. Please create it manually in Supabase Dashboard: Storage > New bucket > Name: pose-images > Public: Yes';
  WHEN OTHERS THEN
    -- If bucket creation fails, it might already exist or need manual creation
    RAISE NOTICE 'Bucket creation failed. If the bucket does not exist, create it manually in Supabase Dashboard: Storage > New bucket > Name: pose-images > Public: Yes';
END $$;

-- Create storage policy: Anyone can view images (public bucket)
CREATE POLICY IF NOT EXISTS "Anyone can view pose images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pose-images');

-- Create storage policy: Anyone can upload images
-- Note: You may want to restrict this to authenticated users only
-- For now, allowing public uploads for ease of use
CREATE POLICY IF NOT EXISTS "Anyone can upload pose images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pose-images');

-- Create storage policy: Anyone can update images
CREATE POLICY IF NOT EXISTS "Anyone can update pose images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pose-images')
WITH CHECK (bucket_id = 'pose-images');

-- Create storage policy: Anyone can delete images
CREATE POLICY IF NOT EXISTS "Anyone can delete pose images"
ON storage.objects FOR DELETE
USING (bucket_id = 'pose-images');

-- ============================================================================
-- ALTERNATIVE: If you want to restrict uploads to authenticated users only,
-- replace the INSERT, UPDATE, and DELETE policies above with:
-- ============================================================================
-- CREATE POLICY IF NOT EXISTS "Authenticated users can upload pose images"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'pose-images' AND auth.role() = 'authenticated');
--
-- CREATE POLICY IF NOT EXISTS "Authenticated users can update pose images"
-- ON storage.objects FOR UPDATE
-- USING (bucket_id = 'pose-images' AND auth.role() = 'authenticated')
-- WITH CHECK (bucket_id = 'pose-images' AND auth.role() = 'authenticated');
--
-- CREATE POLICY IF NOT EXISTS "Authenticated users can delete pose images"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'pose-images' AND auth.role() = 'authenticated');
-- ============================================================================

