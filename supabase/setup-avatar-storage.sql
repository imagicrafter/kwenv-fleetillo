-- =====================================================
-- Supabase Storage Bucket Setup for Driver Avatars
-- =====================================================
-- Run this in Supabase SQL Editor to create the avatars storage bucket
-- This enables storing driver profile images
--
-- Alternative: You can also create the bucket via Supabase Dashboard UI:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name: "avatars"
-- 4. Public: Yes (enabled)
-- 5. File size limit: 5MB (optional)
-- 6. Allowed MIME types: image/jpeg, image/png, image/webp (optional)

-- =====================================================
-- Step 1: Create the storage bucket
-- =====================================================
-- Note: If you prefer using the Dashboard UI, skip this step and use the UI instead
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Step 2: Row Level Security (RLS) Policies
-- =====================================================
-- These policies control who can upload, read, and delete avatar images

-- Policy 1: Allow authenticated users to upload avatars
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Policy 2: Allow public read access to avatars
-- This allows anyone to view avatar images (needed for public profiles)
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Policy 3: Allow authenticated users to delete avatars
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars');

-- =====================================================
-- Verification
-- =====================================================
-- After running this script, verify the bucket was created:
-- SELECT * FROM storage.buckets WHERE id = 'avatars';
--
-- Verify the policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%avatar%';

-- =====================================================
-- Usage Notes
-- =====================================================
-- 1. The bucket is set to "public" which means files are publicly accessible via URL
-- 2. Upload restrictions (file size, MIME types) are enforced in the application layer
-- 3. The driver service will handle uploads using the Supabase Storage API
-- 4. Avatar URLs will be in the format:
--    https://<project-ref>.supabase.co/storage/v1/object/public/avatars/<filename>
