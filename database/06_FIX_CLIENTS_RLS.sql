-- =====================================================
-- FIX cs_clients RLS POLICIES
-- Fix the RLS policies to allow users to see and create their own client records
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own client profile" ON public.cs_clients;
DROP POLICY IF EXISTS "Users can insert own client profile" ON public.cs_clients;
DROP POLICY IF EXISTS "Users can update own client profile" ON public.cs_clients;
DROP POLICY IF EXISTS "Coaches can view their clients" ON public.cs_clients;

-- Policy: Allow authenticated users to view their own client profile
CREATE POLICY "clients_select_own"
    ON public.cs_clients
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Allow authenticated users to insert their own client profile
CREATE POLICY "clients_insert_own"
    ON public.cs_clients
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy: Allow authenticated users to update their own client profile
CREATE POLICY "clients_update_own"
    ON public.cs_clients
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: Allow coaches to view client profiles of their bookings
CREATE POLICY "coaches_view_their_clients"
    ON public.cs_clients
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_bookings b
            JOIN public.cs_coaches c ON c.id = b.coach_id
            WHERE b.client_id = cs_clients.id
            AND c.user_id = auth.uid()
        )
    );

-- Policy: Allow service role full access (for admin operations)
CREATE POLICY "service_role_all"
    ON public.cs_clients
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- ALSO FIX cs_bookings RLS POLICIES
-- The 400 errors on cs_bookings queries suggest missing or incorrect RLS
-- =====================================================

-- Enable RLS on cs_bookings if not already enabled
ALTER TABLE public.cs_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "bookings_select_own" ON public.cs_bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON public.cs_bookings;
DROP POLICY IF EXISTS "bookings_update_own" ON public.cs_bookings;
DROP POLICY IF EXISTS "coaches_view_their_bookings" ON public.cs_bookings;
DROP POLICY IF EXISTS "clients_view_their_bookings" ON public.cs_bookings;

-- Policy: Coaches can view all bookings for their profile
CREATE POLICY "coaches_view_their_bookings"
    ON public.cs_bookings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches c
            WHERE c.id = cs_bookings.coach_id
            AND c.user_id = auth.uid()
        )
    );

-- Policy: Clients can view their own bookings
CREATE POLICY "clients_view_their_bookings"
    ON public.cs_bookings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_clients cl
            WHERE cl.id = cs_bookings.client_id
            AND cl.user_id = auth.uid()
        )
    );

-- Policy: Authenticated users can create bookings
CREATE POLICY "authenticated_create_bookings"
    ON public.cs_bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Either they are creating a booking as a client
        EXISTS (
            SELECT 1 FROM public.cs_clients cl
            WHERE cl.id = cs_bookings.client_id
            AND cl.user_id = auth.uid()
        )
        OR
        -- Or they are creating a booking as a coach (for pro bono, etc)
        EXISTS (
            SELECT 1 FROM public.cs_coaches c
            WHERE c.id = cs_bookings.coach_id
            AND c.user_id = auth.uid()
        )
    );

-- Policy: Coaches and clients can update their bookings
CREATE POLICY "participants_update_bookings"
    ON public.cs_bookings
    FOR UPDATE
    TO authenticated
    USING (
        -- User is the coach
        EXISTS (
            SELECT 1 FROM public.cs_coaches c
            WHERE c.id = cs_bookings.coach_id
            AND c.user_id = auth.uid()
        )
        OR
        -- User is the client
        EXISTS (
            SELECT 1 FROM public.cs_clients cl
            WHERE cl.id = cs_bookings.client_id
            AND cl.user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Same as USING clause
        EXISTS (
            SELECT 1 FROM public.cs_coaches c
            WHERE c.id = cs_bookings.coach_id
            AND c.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.cs_clients cl
            WHERE cl.id = cs_bookings.client_id
            AND cl.user_id = auth.uid()
        )
    );

-- Policy: Service role full access
CREATE POLICY "service_role_bookings_all"
    ON public.cs_bookings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Allow public to SELECT bookings for availability checking
-- This is needed for coaches to check availability before being logged in
CREATE POLICY "public_view_bookings_for_availability"
    ON public.cs_bookings
    FOR SELECT
    TO anon
    USING (
        -- Only expose minimal info: coach_id, start_time, end_time, status
        -- Actual data filtering happens in the query
        true
    );

-- =====================================================
-- VERIFY SETUP
-- =====================================================

-- Show all policies on cs_clients
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cs_clients'
ORDER BY policyname;

-- Show all policies on cs_bookings
SELECT
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
