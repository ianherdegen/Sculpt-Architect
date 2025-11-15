# Pose Variation Image Upload Setup

This document explains how to set up image uploads for pose variations.

## Overview

The pose library now supports:
- Adding images to pose variations
- Displaying variations as cards with images
- Uploading images when creating or editing variations
- Deleting images from variations

## Database Setup

### Step 1: Add image_url column to pose_variations table

Run the migration SQL file in your Supabase SQL Editor:

```sql
-- File: sql/supabase-add-image-url-migration.sql
```

This adds an `image_url` column to the `pose_variations` table.

### Step 2: Set up Supabase Storage

Run the storage setup SQL file in your Supabase SQL Editor:

```sql
-- File: sql/supabase-storage-setup.sql
```

This will:
- Create a public storage bucket named `pose-images`
- Set up storage policies to allow public read access
- Allow uploads, updates, and deletes (currently set to public - you may want to restrict to authenticated users)

**Note:** The storage bucket setup uses `INSERT INTO storage.buckets`. If this doesn't work in your Supabase instance, you can create the bucket manually:

1. Go to your Supabase Dashboard
2. Navigate to **Storage**
3. Click **New bucket**
4. Name it `pose-images`
5. Make it **Public**
6. Set file size limit to 5MB
7. Add allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`

Then run only the policy creation parts of the SQL file.

## Code Changes

### Type Updates
- `PoseVariation` type now includes optional `imageUrl` field
- Database types updated to include `image_url` column

### Service Functions
- `poseVariationService.uploadImage()` - Uploads image to storage and updates variation
- `poseVariationService.deleteImage()` - Deletes image from storage and updates variation
- Updated `create()` and `update()` methods to handle `imageUrl`

### UI Changes
- Pose variations are now displayed as cards in a grid layout
- Each card shows the variation image (or placeholder if no image)
- Image upload UI added to "Add Variation" and "Edit Variation" dialogs
- Delete image button on cards with images

## Usage

1. **Adding a variation with an image:**
   - Click "Add Variation" on a pose
   - Enter the variation name
   - (Optional) Select an image file
   - Click "Add Variation"

2. **Adding an image to an existing variation:**
   - Click "Edit" on a variation card
   - Select an image file
   - Click "Save Changes"

3. **Deleting an image:**
   - Click the X button on the top-right of a variation card with an image
   - Confirm deletion

## File Structure

Images are stored in Supabase Storage at:
```
pose-images/variations/{variationId}-{timestamp}.{ext}
```

The public URL is stored in the `image_url` column of the `pose_variations` table.

## Troubleshooting

**Images not uploading:**
- Check that the storage bucket exists and is public
- Verify storage policies are set correctly
- Check browser console for errors

**Images not displaying:**
- Verify the `image_url` column exists in the database
- Check that the storage bucket is public
- Verify the image URLs are correct

**Permission errors:**
- If you want to restrict uploads to authenticated users, update the storage policies in `sql/supabase-storage-setup.sql`
- Make sure RLS policies allow the operations you need

