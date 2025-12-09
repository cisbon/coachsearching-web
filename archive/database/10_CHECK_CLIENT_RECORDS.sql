-- =====================================================
-- CHECK CLIENT RECORDS
-- Verify cs_clients table and records for troubleshooting
-- =====================================================

-- 1. Check if cs_clients table exists and its structure
SELECT
    'TABLE STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cs_clients'
ORDER BY ordinal_position;

-- 2. Check foreign key constraints on cs_clients
SELECT
    'FOREIGN KEYS' as section,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'cs_clients';

-- 3. Show all existing cs_clients records
SELECT
    'EXISTING CLIENTS' as section,
    id,
    user_id,
    full_name,
    email,
    created_at
FROM public.cs_clients
ORDER BY created_at DESC;

-- 4. Check for specific user's client record
SELECT
    'SPECIFIC USER CLIENT' as section,
    c.id as client_id,
    c.user_id,
    c.email,
    c.full_name,
    u.email as user_email,
    CASE WHEN c.id IS NULL THEN '❌ NO CLIENT RECORD' ELSE '✅ CLIENT EXISTS' END as status
FROM public.cs_users u
LEFT JOIN public.cs_clients c ON c.user_id = u.id
WHERE u.email = 'michael@cisbon.com';

-- 5. Try to manually insert/upsert a client record for this user
DO $$
BEGIN
    INSERT INTO public.cs_clients (
        user_id,
        full_name,
        email,
        phone
    )
    SELECT
        id as user_id,
        full_name,
        email,
        phone
    FROM public.cs_users
    WHERE email = 'michael@cisbon.com'
    ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();

    RAISE NOTICE 'Successfully upserted client record';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error upserting client: % %', SQLERRM, SQLSTATE;
END $$;

-- 6. Verify client record now exists
SELECT
    'AFTER UPSERT' as section,
    c.id as client_id,
    c.user_id,
    c.email,
    c.full_name
FROM public.cs_clients c
JOIN public.cs_users u ON u.id = c.user_id
WHERE u.email = 'michael@cisbon.com';
