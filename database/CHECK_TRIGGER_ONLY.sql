-- Quick check: Does the auth trigger exist?

-- Check if trigger exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'on_auth_user_created'
        )
        THEN '✅ Trigger EXISTS - Signup should work'
        ELSE '❌ Trigger MISSING - Run 04_AUTH_TRIGGER.sql to fix signup'
    END as trigger_status;

-- Check if trigger function exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_proc
            WHERE proname = 'handle_new_user'
        )
        THEN '✅ Function EXISTS'
        ELSE '❌ Function MISSING - Run 04_AUTH_TRIGGER.sql'
    END as function_status;

-- List existing triggers on auth.users (should show on_auth_user_created)
SELECT
    'Triggers on auth.users:' as info,
    tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';
