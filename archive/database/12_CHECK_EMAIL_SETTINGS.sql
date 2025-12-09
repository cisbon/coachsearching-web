-- =====================================================
-- CHECK SUPABASE EMAIL CONFIRMATION SETTINGS
-- Run this to see if email confirmations are enabled
-- =====================================================

-- Check auth configuration
SELECT
    'AUTH CONFIG' as section,
    *
FROM pg_settings
WHERE name LIKE '%email%' OR name LIKE '%confirm%';

-- This won't show the exact setting, but you can test the behavior:
-- 1. Try to sign up a new user
-- 2. Check if session is created immediately

-- The key indicator:
-- If signUp() returns { user: {...}, session: null } → Email confirmations are ENABLED (bad)
-- If signUp() returns { user: {...}, session: {...} } → Email confirmations are DISABLED (good)

-- You can also check in Supabase Dashboard:
-- Authentication → Settings → "Enable email confirmations"
-- If CHECKED ☑ → You need to UNCHECK it
-- If UNCHECKED ☐ → Perfect, the app will work

SELECT
    'REMINDER' as message,
    'Go to Supabase Dashboard → Authentication → Settings → UNCHECK "Enable email confirmations"' as action_needed;
