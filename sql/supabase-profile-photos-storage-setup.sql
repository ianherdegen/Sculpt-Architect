-- ============================================================================
-- SUPABASE STORAGE SETUP FOR PROFILE PHOTOS
-- ============================================================================
-- This script sets up a storage bucket for user profile photos
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Create the storage bucket for profile photos
-- Note: You may need to create the bucket manually in the Supabase Dashboard
-- Go to Storage > New bucket, name it 'profile-photos', make it public
-- 
-- If you get RLS errors, the bucket might not exist. Create it manually first, then run the policies below.

-- Try to create the bucket (this might fail due to RLS - if so, create manually)
DO $$
BEGIN
  -- Try to insert the bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'profile-photos',
    'profile-photos',
    true, -- Public bucket so images can be accessed without auth
    5242880, -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot create bucket due to permissions. Please create it manually in Supabase Dashboard: Storage > New bucket > Name: profile-photos > Public: Yes';
  WHEN OTHERS THEN
    -- If bucket creation fails, it might already exist or need manual creation
    RAISE NOTICE 'Bucket creation failed. If the bucket does not exist, create it manually in Supabase Dashboard: Storage > New bucket > Name: profile-photos > Public: Yes';
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;

-- Create storage policy: Anyone can view profile photos (public bucket)
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Create storage policy: Authenticated users can upload their own profile photos
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create storage policy: Users can update their own profile photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create storage policy: Users can delete their own profile photos
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- NOTE: Profile photos are stored in folders by user ID:
-- profile-photos/{user_id}/{filename}
-- This ensures users can only manage their own photos
-- ============================================================================
