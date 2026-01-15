-- ============================================================================
-- Migration: 20260115000002_create_avatars_storage_bucket
-- Description: Create Supabase Storage bucket for driver avatars
-- Created: 2026-01-15
-- Note: This migration creates the 'avatars' storage bucket and sets up
--       appropriate RLS policies for upload, read, and delete operations.
-- ============================================================================

-- Create the avatars storage bucket (public for read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,  -- Public bucket so avatar URLs can be accessed without auth
    5242880,  -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES: avatars bucket
-- ============================================================================

-- Policy: Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars');

-- Policy: Allow public read access to avatars (since bucket is public)
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
CREATE POLICY "Public read access for avatars"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- Policy: Allow authenticated users to update their avatars
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars');

-- Policy: Allow authenticated users to delete avatars
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars');

-- Policy: Allow service role full access to avatars bucket
DROP POLICY IF EXISTS "Service role has full access to avatars" ON storage.objects;
CREATE POLICY "Service role has full access to avatars"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'avatars')
    WITH CHECK (bucket_id = 'avatars');
