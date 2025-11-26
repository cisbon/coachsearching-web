# 🚨 SUPABASE QUICK FIX - Missing Columns Error

## Problem
You're seeing: **"Error: Could not find the 'avatar_url' column of 'coaches' in the schema cache"**

This happens because your Supabase `coaches` table is missing columns that the app needs.

## Solution (5 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **kzyeanhtiwyrtiyqgawh**
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Fix SQL
1. Click **"New Query"**
2. Open the file: `database/QUICK_FIX_add_missing_columns.sql`
3. Copy the entire contents
4. Paste into the Supabase SQL Editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 3: Verify
You should see:
```
Success. No rows returned
```

### Step 4: Test Your App
1. Refresh CoachSearching.com
2. Login as a coach
3. Go to Dashboard → Profile
4. Try saving your profile again

**It should work now!** ✅

---

## What This Fix Does

The SQL script adds these missing columns to your `coaches` table:
- `full_name` - Your full name
- `avatar_url` - Profile picture URL
- `title` - Your professional title (e.g., "Certified Life Coach")
- `location` - Your location
- `languages` - Languages you speak
- `session_types` - Online/Onsite preferences
- `onboarding_completed` - Profile completion flag
- `rating_average` - Your average rating
- `rating_count` - Number of reviews

---

## Alternative: Full Schema Setup

If you want the complete database schema with all features (bookings, reviews, articles, etc.), run:

1. Open `database/schema.sql`
2. Copy the entire file
3. Paste into Supabase SQL Editor
4. Click "Run"

⚠️ **Warning:** This will create 30+ tables. Only do this if you want the full platform features.

---

## Still Having Issues?

Check the debug console. You should see:
```
✅ [SAVE DEBUG] Saved successfully via Supabase
```

If you see errors, copy the error message and let me know!
