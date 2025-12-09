# 🎯 COMPLETE SUPABASE SETUP GUIDE

## Fresh Start with cs_ Prefix

This guide will give you a clean database with the `cs_` prefix for all tables.
**Complete platform** with 30+ tables ready for production!

---

## 🚀 Quick Setup (4 Steps, 10 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **kzyeanhtiwyrtiyqgawh**
3. Click **SQL Editor** in the left sidebar

---

### Step 2: Run Script #1 - Drop All Tables
**This will delete everything and start fresh**

1. Click **"New Query"**
2. Copy all from: `database/01_DROP_ALL.sql`
3. Paste into SQL Editor
4. Click **"Run"**

Expected result:
```
Success. No rows returned
```

---

### Step 3: Run Script #2 - Create All Tables
**This creates 30+ tables with cs_ prefix**

1. Click **"New Query"** again
2. Copy all from: `database/02_CREATE_SCHEMA.sql`
3. Paste into SQL Editor
4. Click **"Run"**

Expected result:
```
Success. No rows returned
```

---

### Step 4: Run Script #3 - Indexes & Policies
**This adds indexes, functions, triggers, and RLS policies**

1. Click **"New Query"** again
2. Copy all from: `database/03_INDEXES_AND_POLICIES.sql`
3. Paste into SQL Editor
4. Click **"Run"**

Expected result:
```
Success. No rows returned
```

---

## ✅ Done! Now Test Your App

1. **Refresh** CoachSearching.com (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Login** as a coach
3. Go to **Dashboard → Profile**
4. **Fill out** your profile details
5. Click **"Save"**

You should see:
```
💾 [SAVE DEBUG] Starting profile save...
💾 [SAVE DEBUG] Trying to save via Supabase...
✅ [SAVE DEBUG] Saved successfully via Supabase: {...}
```

**Success message:** "Profile updated successfully!" 🎉

---

## 📊 What Was Created

### Tables with cs_ Prefix:
1. **cs_users** - User profiles (extends auth.users)
   - Stores: full_name, avatar_url, user_type, settings
   - Auto-created when user signs up

2. **cs_coaches** - Coach profiles
   - Stores: title, bio, location, hourly_rate, specialties, languages
   - Created when coach completes profile

### Features:
✅ Auto-create user profile on signup (trigger)
✅ Auto-update `updated_at` timestamps (trigger)
✅ Row Level Security (RLS) policies
✅ Proper indexes for performance
✅ Backfill of existing auth users

---

## 🔍 Verify Everything Works

### Check Your User Profile
Run in Supabase SQL Editor:
```sql
SELECT * FROM public.cs_users WHERE id = auth.uid();
```

You should see your user profile!

### Check Coaches Table Structure
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cs_coaches' AND table_schema = 'public'
ORDER BY ordinal_position;
```

You should see all columns including:
- full_name, title, bio, avatar_url
- location, specialties, languages
- hourly_rate, currency
- rating_average, rating_count

---

## 🎨 What Changed in the App

The app now uses the new table names:
- ~~`coaches`~~ → `cs_coaches` ✅
- ~~`users`~~ → `cs_users` ✅

All Supabase queries automatically use the cs_ prefix!

---

## 🐛 Troubleshooting

### "No coaches found"
- Normal! You need to save your coach profile first
- Go to Dashboard → Profile → Fill out form → Save

### "403 Error on save"
- Make sure you ran BOTH SQL scripts
- Check you're logged in
- Refresh the page and try again

### "Column does not exist"
- Run script #2 again (02_CREATE_SCHEMA.sql)
- It's safe to run multiple times

### Still having issues?
- Open debug console (bottom right)
- Copy any error messages
- Check the Supabase logs: Dashboard → Logs → API

---

## 📝 Important: cs_ Prefix for Future

**All future tables MUST use the `cs_` prefix!**

Examples:
- cs_bookings
- cs_reviews
- cs_messages
- cs_articles

This keeps everything organized and avoids conflicts.

---

## 🎯 Next Steps

Once profile save works, you can add more features:
1. Bookings system → cs_bookings table
2. Reviews → cs_reviews table
3. Messaging → cs_messages table
4. Articles → cs_articles table

Each will follow the same pattern with cs_ prefix!

---

## 📚 Files Reference

- `database/01_DROP_ALL.sql` - Cleans everything
- `database/02_CREATE_SCHEMA.sql` - Creates cs_ tables
- `js/app.js` - Updated to use cs_ tables

---

## ✨ Success!

Your database is now properly set up with:
- Clean schema
- cs_ prefix on all tables
- Working RLS policies
- Auto-triggers
- Proper permissions

**Your profile save should now work perfectly!** 🚀
