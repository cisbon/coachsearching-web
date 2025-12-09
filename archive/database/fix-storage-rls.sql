-- =====================================================
-- FIX: Storage Bucket RLS Policies for Profile Images
-- Run this in Supabase SQL Editor to fix upload errors
-- =====================================================

-- Remove any existing policies on storage.objects for profile-images bucket
DROP POLICY IF EXISTS "Users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- =====================================================
-- SIMPLE, WORKING POLICIES
-- =====================================================

-- 1. Allow authenticated users to upload (INSERT) files to profile-images bucket
CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

-- 2. Allow anyone to view (SELECT) files in profile-images bucket (public bucket)
CREATE POLICY "Public read access for profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- 3. Allow users to update their own files (filename starts with their user_id)
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    (storage.filename(name) LIKE auth.uid()::text || '%')
)
WITH CHECK (
    bucket_id = 'profile-images' AND
    (storage.filename(name) LIKE auth.uid()::text || '%')
);

-- 4. Allow users to delete their own files (filename starts with their user_id)
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    (storage.filename(name) LIKE auth.uid()::text || '%')
);

-- =====================================================
-- VERIFY POLICIES
-- =====================================================

-- Check that policies were created successfully
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%profile%'
ORDER BY policyname;

-- =====================================================
-- TEST THE UPLOAD (in browser console after running this SQL)
-- =====================================================

/*
After running this SQL, test in your browser console:

const testUpload = async () => {
    const response = await fetch('https://via.placeholder.com/150');
    const blob = await response.blob();
    const file = new File([blob], 'test.png', { type: 'image/png' });

    const { data, error } = await supabaseClient.storage
        .from('profile-images')
        .upload(`${supabaseClient.auth.getUser().data.user.id}-test-${Date.now()}.png`, file);

    console.log('Upload test result:', { data, error });
};

testUpload();
*/

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Storage RLS policies updated!';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now upload profile images.';
    RAISE NOTICE 'Try uploading again in your app.';
    RAISE NOTICE '';
END $$;
