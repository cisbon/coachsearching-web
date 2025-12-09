-- =====================================================
-- DIAGNOSTIC CHECK: Verify Database Setup
-- Run this to check if your database is properly configured
-- =====================================================

-- Check 1: Does cs_users table exist?
SELECT
    'cs_users table' as check_name,
    CASE WHEN EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'cs_users'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check 2: Does cs_user_role enum exist?
SELECT
    'cs_user_role enum' as check_name,
    CASE WHEN EXISTS (
        SELECT FROM pg_type
        WHERE typname = 'cs_user_role'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check 3: Does the trigger exist?
SELECT
    'on_auth_user_created trigger' as check_name,
    CASE WHEN EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check 4: Does the trigger function exist?
SELECT
    'handle_new_user function' as check_name,
    CASE WHEN EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'handle_new_user'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check 5: List all tables in public schema
SELECT
    'Available tables' as info,
    string_agg(table_name, ', ') as tables
FROM information_schema.tables
WHERE table_schema = 'public';

-- Check 6: Check RLS policies on cs_users
SELECT
    'cs_users RLS policies' as info,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'cs_users';

-- If you see any ❌ MISSING items above, you need to run the corresponding SQL files:
-- 1. cs_users table MISSING → Run 02_CREATE_SCHEMA.sql
-- 2. cs_user_role enum MISSING → Run 02_CREATE_SCHEMA.sql
-- 3. Trigger MISSING → Run 04_AUTH_TRIGGER.sql
