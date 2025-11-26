-- =====================================================
-- BACKFILL MISSING cs_users RECORDS
-- Create cs_users records for any auth.users that don't have them
-- =====================================================

-- Insert missing cs_users records for all auth.users
INSERT INTO public.cs_users (
    id,
    email,
    full_name,
    avatar_url,
    role,
    user_type,
    is_email_verified,
    created_at,
    updated_at
)
SELECT
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        split_part(au.email, '@', 1)
    ) as full_name,
    COALESCE(
        au.raw_user_meta_data->>'avatar_url',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.email
    ) as avatar_url,
    COALESCE(
        (au.raw_user_meta_data->>'user_type')::cs_user_role,
        'client'::cs_user_role
    ) as role,
    COALESCE(
        au.raw_user_meta_data->>'user_type',
        'client'
    ) as user_type,
    COALESCE(au.email_confirmed_at IS NOT NULL, false) as is_email_verified,
    COALESCE(au.created_at, NOW()) as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.cs_users cu ON cu.id = au.id
WHERE cu.id IS NULL;

-- Show what was created
SELECT
    id,
    email,
    full_name,
    role,
    user_type,
    created_at
FROM public.cs_users
ORDER BY created_at DESC;

-- Verify the trigger exists and is enabled
SELECT
    tgname as trigger_name,
    tgenabled as enabled,
    proname as function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'on_auth_user_created';

-- If no results, the trigger doesn't exist - you need to run 04_AUTH_TRIGGER.sql
