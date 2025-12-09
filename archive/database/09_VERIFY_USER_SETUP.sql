-- =====================================================
-- VERIFY USER SETUP
-- Check if cs_users records exist for logged-in users
-- =====================================================

-- 1. Show all auth.users
SELECT
    'AUTH USERS' as section,
    id,
    email,
    created_at,
    email_confirmed_at IS NOT NULL as email_verified,
    raw_user_meta_data->>'user_type' as user_type_meta
FROM auth.users
ORDER BY created_at DESC;

-- 2. Show all cs_users
SELECT
    'CS_USERS' as section,
    id,
    email,
    full_name,
    role,
    user_type,
    created_at
FROM public.cs_users
ORDER BY created_at DESC;

-- 3. Find auth.users that DON'T have cs_users records
SELECT
    'MISSING CS_USERS' as section,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN public.cs_users cu ON cu.id = au.id
WHERE cu.id IS NULL;

-- 4. Check specific user by email (replace with your email)
SELECT
    'SPECIFIC USER CHECK' as section,
    au.id as auth_user_id,
    au.email,
    cu.id as cs_user_id,
    CASE WHEN cu.id IS NULL THEN '❌ MISSING' ELSE '✅ EXISTS' END as cs_user_status
FROM auth.users au
LEFT JOIN public.cs_users cu ON cu.id = au.id
WHERE au.email = 'michael@cisbon.com';
