# Supabase Setup Guide - CoachSearching.com

## 🚨 Quick Fix: Profile Image Upload Error

If you're getting **"Bucket not found"** error when uploading profile images, follow these steps:

### Step 1: Create Storage Bucket

1. **Open your Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to Storage** (left sidebar)
3. **Click "New Bucket"**
4. **Configure the bucket:**
   - **Name:** `profile-images` (exactly this name!)
   - **Public bucket:** ✅ **YES** (toggle this ON)
   - **File size limit:** 5MB
   - **Allowed MIME types:** Leave empty (allows all images)
5. **Click "Create Bucket"**

### Step 2: Set Bucket Policies (Optional but Recommended)

**Apply RLS Policies:** Run the pre-made SQL script `database/fix-storage-rls.sql` in SQL Editor, OR manually create these policies:

```sql
-- 1. Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

-- 2. Allow public read access (bucket is public)
CREATE POLICY "Public read access for profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- 3. Allow users to update their own files (filename starts with user_id)
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

-- 4. Allow users to delete their own files
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    (storage.filename(name) LIKE auth.uid()::text || '%')
);
```

**Easier Method:** Just run `database/fix-storage-rls.sql` - it does all of this for you!

### Step 3: Test Upload

1. Log in to your platform
2. Go to Profile/Dashboard
3. Try uploading an image
4. Should work now! ✅

---

## 📋 Complete Supabase Setup Checklist

Use this checklist to ensure your Supabase instance is fully configured.

### ✅ 1. Database Schema

- [ ] Run `database/init-schema.sql` in SQL Editor
- [ ] Verify tables created: Run `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';`
- [ ] Should return 25+ tables

### ✅ 2. Storage Buckets

- [ ] Create `profile-images` bucket (Public)
- [ ] Set bucket policies (see Step 2 above)
- [ ] Test upload functionality

### ✅ 3. Authentication Settings

**Go to Authentication > Settings:**

- [ ] **Enable Email Auth**: ON
- [ ] **Enable Email Confirmations**: ON (for production)
- [ ] **Secure Email Change**: ON
- [ ] **Site URL**: Your production domain (e.g., `https://coachsearching.com`)
- [ ] **Redirect URLs**: Add your domains to allowed list

**Email Templates** (optional but recommended):

- [ ] Customize Confirmation email
- [ ] Customize Password Reset email
- [ ] Customize Magic Link email

### ✅ 4. API Keys & Environment

**Get your keys** from Settings > API:

- [ ] Copy `Project URL`
- [ ] Copy `anon public` key
- [ ] Update your `api/config.php`:

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'SUPABASE_URL' => 'https://YOUR-PROJECT.supabase.co',
    'SUPABASE_ANON_KEY' => 'your-anon-key-here'
]);
```

### ✅ 5. Row Level Security (RLS)

**Verify RLS is enabled:**

```sql
-- Run this in SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All tables should show rowsecurity = true
```

**Test a policy:**

```sql
-- Should only return your own data
SELECT * FROM public.users WHERE id = auth.uid();
```

### ✅ 6. Database Functions

**Test helper functions:**

```sql
-- Test invoice number generation
SELECT generate_invoice_number();

-- Should return something like: INV-2025-000001
```

### ✅ 7. Indexes & Performance

**Verify indexes created:**

```sql
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Should see indexes on: bookings, reviews, messages, etc.
```

### ✅ 8. Session Notes Tables (New Feature)

- [ ] Run `database/session-notes-schema.sql` in SQL Editor
- [ ] Verify new tables:
  - `session_notes`
  - `client_goals`
  - `session_templates`
  - `client_tags`

---

## 🔧 Troubleshooting Common Issues

### Issue: "Bucket not found"
**Solution:** Create the `profile-images` bucket as described in Step 1 above.

### Issue: "Permission denied for table users"
**Solution:** RLS policies may be blocking access. Check:
1. You're authenticated (check session in browser console)
2. Policies are created (re-run `init-schema.sql`)
3. User ID matches (run `SELECT auth.uid()` to verify)

### Issue: "relation does not exist"
**Solution:** Database schema not initialized. Run `init-schema.sql`.

### Issue: Images upload but don't display
**Solution:**
1. Bucket must be **Public**
2. Check if URL is correct: `https://PROJECT.supabase.co/storage/v1/object/public/profile-images/filename.jpg`
3. Verify CORS settings in Supabase Storage

### Issue: "Row Level Security policy violation"
**Solution:**
```sql
-- Check which policies exist
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- If missing, re-run init-schema.sql
```

### Issue: Email confirmations not sending
**Solution:**
1. Go to Authentication > Settings > Email Templates
2. Enable "Confirm email" template
3. Check spam folder
4. For development, use Supabase's email logs

---

## 🚀 Production Checklist

Before going live:

### Security

- [ ] Enable RLS on ALL tables
- [ ] Review and test ALL policies
- [ ] Remove any test data
- [ ] Change default passwords
- [ ] Enable email confirmations
- [ ] Set up password requirements
- [ ] Enable rate limiting (Supabase Settings)

### Storage

- [ ] Set file size limits
- [ ] Configure MIME type restrictions
- [ ] Set up automatic image optimization (if needed)
- [ ] Plan for CDN (Supabase has built-in CDN)

### Database

- [ ] Enable Point-in-Time Recovery
- [ ] Set up automated backups
- [ ] Configure backup retention
- [ ] Test restore procedure

### Monitoring

- [ ] Set up database monitoring
- [ ] Configure alerts for:
  - High CPU usage
  - Storage limits
  - Error rates
  - Slow queries
- [ ] Enable logging
- [ ] Set up uptime monitoring

### Performance

- [ ] Review slow query log
- [ ] Add missing indexes
- [ ] Optimize RLS policies
- [ ] Enable connection pooling if needed
- [ ] Configure caching strategy

---

## 📊 Testing Your Setup

### 1. Database Test

```sql
-- Run this in SQL Editor

-- Test user creation (should work)
SELECT auth.uid();

-- Test coach profile (should return your coach data)
SELECT * FROM coaches WHERE user_id = auth.uid();

-- Test RLS (should only show your bookings)
SELECT * FROM bookings LIMIT 5;
```

### 2. Storage Test

```javascript
// Run this in browser console on your app

const testUpload = async () => {
    const response = await fetch('https://via.placeholder.com/150');
    const blob = await response.blob();
    const file = new File([blob], 'test.png', { type: 'image/png' });

    const { data, error } = await supabaseClient.storage
        .from('profile-images')
        .upload(`test-${Date.now()}.png`, file);

    console.log('Upload result:', { data, error });
};

testUpload();
```

### 3. Auth Test

```javascript
// Test authentication
const testAuth = async () => {
    const { data, error } = await supabaseClient.auth.getSession();
    console.log('Session:', data);
    console.log('User:', data?.session?.user);
};

testAuth();
```

---

## 🆘 Need Help?

### Supabase Resources

- **Documentation**: https://supabase.com/docs
- **Discord**: https://discord.supabase.com
- **Status**: https://status.supabase.com

### CoachSearching Resources

- **UPDATE_Nov26.md**: Latest implementation summary
- **email-templates/README.md**: Email integration guide
- **database/init-schema.sql**: Complete database structure

### Common Supabase Commands

```sql
-- See all tables
\dt public.*

-- See table structure
\d+ public.users

-- See all policies
SELECT * FROM pg_policies;

-- See storage buckets
SELECT * FROM storage.buckets;

-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));
```

---

## ✅ Setup Complete!

Once you've completed all steps above, your Supabase instance should be fully configured and ready for production!

**Next Steps:**
1. Test all features end-to-end
2. Run security audit
3. Set up monitoring
4. Deploy to production
5. 🎉 Launch!

---

**Last Updated:** November 26, 2025
**Version:** 1.0.0
**Supabase Version:** Latest
