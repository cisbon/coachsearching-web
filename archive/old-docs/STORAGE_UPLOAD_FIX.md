# 🔧 Quick Fix: Storage Upload Error

## Error You're Seeing

```
Error: new row violates row-level security policy
Status: 403
```

## What Happened

You created the `profile-images` bucket ✅, but the **Row Level Security (RLS) policies** need to be set up to allow uploads.

---

## ⚡ Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Fix

1. Open the file: `database/fix-storage-rls.sql`
2. **Copy all the contents**
3. **Paste into SQL Editor**
4. Click **"Run"** button

### Step 3: Test Upload

1. Go back to your app
2. Try uploading a profile image again
3. **Should work now!** ✅

---

## What This Does

The SQL script creates 4 policies:

1. ✅ **Upload Policy** - Authenticated users can upload to `profile-images`
2. ✅ **Public Read** - Anyone can view images (public bucket)
3. ✅ **Update Policy** - Users can update their own files
4. ✅ **Delete Policy** - Users can delete their own files

---

## Verify It Worked

After running the SQL, check policies exist:

```sql
SELECT policyname
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%profile%';
```

Should return 4 rows:
- Authenticated users can upload profile images
- Public read access for profile images
- Users can update own profile images
- Users can delete own profile images

---

## Still Having Issues?

### Issue: "Permission denied"

**Solution:** Make sure you're logged in (check session in console)

### Issue: "Bucket not found"

**Solution:** Create the bucket:
1. Storage → New Bucket
2. Name: `profile-images`
3. Public: YES ✅

### Issue: Still getting RLS error after running SQL

**Solution:** Clear your browser cache and reload the page

### Issue: "Cannot create policy"

**Solution:** The policies might already exist with different names. Run this first:

```sql
-- Remove ALL policies on storage.objects for profile-images
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND (
              policyname LIKE '%profile%'
              OR policyname LIKE '%avatar%'
              OR policyname LIKE '%image%'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;
```

Then run `fix-storage-rls.sql` again.

---

## Technical Details (Optional Reading)

### Why Did This Happen?

Supabase Storage uses PostgreSQL Row Level Security (RLS) to control access. When you create a bucket, it doesn't automatically create policies - you need to add them.

### File Naming Convention

Your app uploads files with this pattern:
```
{user_id}-{field_name}-{timestamp}.{extension}
```

Example:
```
316af5e6-ff2c-45f6-8697-c8d22020a79f-avatar_url-1764121464284.jpeg
```

The policies check if the filename **starts with your user_id** to ensure you can only modify your own files.

### Why Not Use Folders?

The current implementation uses flat file storage (all files in bucket root). This is simpler and works fine for profile images. You could alternatively use folder-based storage (`{user_id}/{filename}`), but that requires code changes.

---

## Prevention for Production

Before going live, run this checklist:

- [ ] Storage bucket created (`profile-images`)
- [ ] Bucket is set to **Public**
- [ ] RLS policies applied (run `fix-storage-rls.sql`)
- [ ] Test upload works
- [ ] Test different file types (jpg, png, jpeg)
- [ ] Test file size limits (max 5MB in your code)
- [ ] Test on mobile device
- [ ] Set up monitoring for storage errors

---

## Alternative: Disable RLS (Not Recommended for Production)

If you're just testing and want a quick workaround:

```sql
-- WARNING: This makes the bucket completely public!
-- Anyone can upload/delete files. Use only for testing!

ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

**Don't use this in production!** It's a security risk.

Instead, always use proper RLS policies like in `fix-storage-rls.sql`.

---

## Summary

**Problem:** RLS policies missing → uploads blocked

**Solution:** Run `database/fix-storage-rls.sql` in SQL Editor

**Result:** Uploads work! ✅

---

**Last Updated:** November 26, 2025
**Issue:** Storage RLS Policy
**Status:** ✅ Fixed
**Time to Fix:** 2 minutes
