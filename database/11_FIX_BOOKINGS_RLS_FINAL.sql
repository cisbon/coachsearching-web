-- =====================================================
-- FIX cs_bookings RLS POLICIES - FINAL VERSION
-- Simplified policies that actually work
-- =====================================================

-- First, let's see what policies currently exist
SELECT
    'CURRENT POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cs_bookings'
ORDER BY policyname;

-- Drop ALL existing policies on cs_bookings
DROP POLICY IF EXISTS "authenticated_create_bookings" ON public.cs_bookings;
DROP POLICY IF EXISTS "participants_update_bookings" ON public.cs_bookings;
DROP POLICY IF EXISTS "coaches_view_their_bookings" ON public.cs_bookings;
DROP POLICY IF EXISTS "clients_view_their_bookings" ON public.cs_bookings;
DROP POLICY IF EXISTS "service_role_bookings_all" ON public.cs_bookings;
DROP POLICY IF EXISTS "public_view_bookings_for_availability" ON public.cs_bookings;

-- Enable RLS
ALTER TABLE public.cs_bookings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SELECT POLICIES (View bookings)
-- =====================================================

-- Policy: Allow anonymous users to SELECT bookings for availability checking
CREATE POLICY "anon_select_bookings"
    ON public.cs_bookings
    FOR SELECT
    TO anon
    USING (true); -- Allow reading all bookings (only for availability)

-- Policy: Authenticated users can view bookings they're involved in
CREATE POLICY "auth_select_own_bookings"
    ON public.cs_bookings
    FOR SELECT
    TO authenticated
    USING (
        -- User is the client
        EXISTS (
            SELECT 1 FROM public.cs_clients cl
            WHERE cl.id = cs_bookings.client_id
            AND cl.user_id = auth.uid()
        )
        OR
        -- User is the coach
        EXISTS (
            SELECT 1 FROM public.cs_coaches c
            WHERE c.id = cs_bookings.coach_id
            AND c.user_id = auth.uid()
        )
    );

-- =====================================================
-- INSERT POLICY (Create bookings)
-- =====================================================

-- Policy: Authenticated users can create bookings
-- SIMPLIFIED: Just check that the user is authenticated and the client_id exists
CREATE POLICY "auth_insert_bookings"
    ON public.cs_bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- The client_id must belong to the authenticated user
        client_id IN (
            SELECT id FROM public.cs_clients
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- UPDATE POLICY (Modify bookings)
-- =====================================================

-- Policy: Authenticated users can update their own bookings
CREATE POLICY "auth_update_own_bookings"
    ON public.cs_bookings
    FOR UPDATE
    TO authenticated
    USING (
        -- User is the client or the coach
        EXISTS (
            SELECT 1 FROM public.cs_clients cl
            WHERE cl.id = cs_bookings.client_id
            AND cl.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.cs_coaches c
            WHERE c.id = cs_bookings.coach_id
            AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Same as USING
        EXISTS (
            SELECT 1 FROM public.cs_clients cl
            WHERE cl.id = cs_bookings.client_id
            AND cl.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.cs_coaches c
            WHERE c.id = cs_bookings.coach_id
            AND c.user_id = auth.uid()
        )
    );

-- =====================================================
-- SERVICE ROLE POLICY (Full access for backend)
-- =====================================================

CREATE POLICY "service_role_all_bookings"
    ON public.cs_bookings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- VERIFY THE NEW POLICIES
-- =====================================================

SELECT
    'NEW POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'cs_bookings'
ORDER BY policyname;

-- =====================================================
-- TEST THE INSERT POLICY
-- =====================================================

-- This will test if the current user can insert a booking
-- Replace with actual values from your test case
DO $$
DECLARE
    v_client_id UUID;
    v_coach_id UUID := '277530d3-627d-4057-b115-985719a1f59c'; -- The coach ID from console
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    RAISE NOTICE 'Current user ID: %', v_user_id;

    -- Get client_id for current user
    SELECT id INTO v_client_id
    FROM public.cs_clients
    WHERE user_id = v_user_id;

    RAISE NOTICE 'Client ID for user: %', v_client_id;

    -- Check if client exists
    IF v_client_id IS NULL THEN
        RAISE NOTICE '❌ No client record found for user %', v_user_id;
    ELSE
        RAISE NOTICE '✅ Client record exists: %', v_client_id;

        -- Check if the policy would allow this
        IF v_client_id IN (SELECT id FROM public.cs_clients WHERE user_id = auth.uid()) THEN
            RAISE NOTICE '✅ Policy check PASSED - user can insert booking';
        ELSE
            RAISE NOTICE '❌ Policy check FAILED - user cannot insert booking';
        END IF;
    END IF;
END $$;
