-- ============================================================================
-- FIX STORAGE RLS POLICIES FOR POSE IMAGES
-- ============================================================================
-- Run this if you're getting "new row violates RLS policy" errors
-- This ensures the storage bucket exists and has proper policies
-- ============================================================================

-- STEP 1: Verify the bucket exists
-- Run this query first to check:
-- SELECT * FROM storage.buckets WHERE id = 'pose-images';
--
-- If the bucket doesn't exist, create it manually:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name: pose-images
-- 4. Public: Yes (toggle it on)
-- 5. File size limit: 5MB
-- 6. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif
-- 7. Click "Create bucket"

-- STEP 2: Drop existing policies for this bucket (if any)
DROP POLICY IF EXISTS "Anyone can view pose images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload pose images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update pose images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete pose images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload pose images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update pose images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete pose images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload pose images" ON storage.objects;
DROP POLICY IF EXISTS "Public can update pose images" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete pose images" ON storage.objects;

-- STEP 3: Create storage policies
-- Policy: Anyone can view images (public bucket)
CREATE POLICY "Anyone can view pose images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pose-images');

-- Policy: Anyone can upload images
-- This allows anonymous/public uploads
CREATE POLICY "Anyone can upload pose images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pose-images');

-- Policy: Anyone can update images
CREATE POLICY "Anyone can update pose images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pose-images')
WITH CHECK (bucket_id = 'pose-images');

-- Policy: Anyone can delete images
CREATE POLICY "Anyone can delete pose images"
ON storage.objects FOR DELETE
USING (bucket_id = 'pose-images');

-- ============================================================================
-- VERIFY THE BUCKET EXISTS
-- ============================================================================
-- Run this query to check if the bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'pose-images';
--
-- If it doesn't exist, create it manually in the Supabase Dashboard:
-- 1. Go to Storage
-- 2. Click "New bucket"
-- 3. Name: pose-images
-- 4. Public: Yes
-- 5. File size limit: 5MB
-- 6. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif
-- ============================================================================

