# 🚨 SUPABASE QUICK FIX - Missing Columns & RLS Policy Errors

## Problems You May See
1. **"Error: Could not find the 'avatar_url' column of 'coaches' in the schema cache"**
2. **"Error: new row violates row-level security policy for table 'coaches'"**

These happen because your Supabase database needs to be set up.

## Solution (5 Minutes - 2 SQL Scripts)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **kzyeanhtiwyrtiyqgawh**
3. Click **SQL Editor** in the left sidebar

### Step 2: Run Script #1 - Add Missing Columns
1. Click **"New Query"**
2. Open the file: `database/QUICK_FIX_add_missing_columns.sql`
3. Copy the entire contents
4. Paste into the Supabase SQL Editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)

You should see: `Success. No rows returned`

### Step 3: Run Script #2 - Fix RLS Policies
1. Click **"New Query"** again
2. Open the file: `database/FIX_RLS_POLICY.sql`
3. Copy the entire contents
4. Paste into the Supabase SQL Editor
5. Click **"Run"**

You should see: `Success. No rows returned`

### Step 4: Test Your App
1. Refresh CoachSearching.com
2. Login as a coach
3. Go to Dashboard → Profile
4. Try saving your profile again

**It should work now!** ✅

---

## What These Scripts Do

### Script #1: QUICK_FIX_add_missing_columns.sql
Adds missing columns to your `coaches` table:
- `full_name`, `avatar_url`, `title`, `location`
- `languages`, `session_types`, `onboarding_completed`
- `rating_average`, `rating_count`

### Script #2: FIX_RLS_POLICY.sql
Fixes Row Level Security policies:
- Creates `public.users` table if missing
- Sets up automatic user profile creation on signup
- Backfills existing auth users into public.users
- Updates RLS policies so coaches can insert/update their profiles
- Grants necessary permissions

---

## After Running Both Scripts

Your profile save will work! The debug console will show:
```
💾 [SAVE DEBUG] Starting profile save...
💾 [SAVE DEBUG] Trying to save via API...
⚠️ [SAVE DEBUG] API save failed...
💾 [SAVE DEBUG] Trying to save via Supabase...
✅ [SAVE DEBUG] Saved successfully via Supabase: {...}
```

And you'll see: **"Profile updated successfully!"** 🎉

---

## Still Having Issues?

Check the debug console for specific errors. Common issues:

**406 Error on Profile Load:**
- The schema cache needs to refresh
- Solution: Wait 30 seconds and refresh the page

**403 Error on Save:**
- RLS policy still blocking
- Solution: Make sure you ran BOTH SQL scripts

**Other Errors:**
Copy the error message from the console and let me know!

---

## Alternative: Full Schema Setup

If you want the complete database schema with all features (bookings, reviews, articles, etc.), run:

1. Open `database/schema.sql`
2. Copy the entire file
3. Paste into Supabase SQL Editor
4. Click "Run"

⚠️ **Warning:** This will create 30+ tables. Only do this if you want the full platform features.

