-- =====================================================
-- ADD MISSING cs_clients TABLE
-- This table extends cs_users for client-specific data
-- Follows the same pattern as cs_coaches
-- =====================================================

-- Client profiles (extends cs_users for clients)
CREATE TABLE IF NOT EXISTS public.cs_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.cs_users(id) ON DELETE CASCADE,

    -- Profile Information
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,

    -- Preferences
    preferred_coach_types TEXT[] DEFAULT '{}',
    preferred_specialties TEXT[] DEFAULT '{}',
    preferred_languages TEXT[] DEFAULT '{}',
    budget_range_min DECIMAL(10,2),
    budget_range_max DECIMAL(10,2),
    currency TEXT DEFAULT 'EUR',

    -- Communication Preferences
    timezone TEXT,
    preferred_meeting_type TEXT, -- 'online', 'onsite', 'both'

    -- Statistics
    total_bookings INTEGER DEFAULT 0,
    total_completed_sessions INTEGER DEFAULT 0,
    total_amount_spent DECIMAL(10,2) DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_booking_at TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cs_clients_user_id ON public.cs_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_clients_email ON public.cs_clients(email);

-- Update cs_bookings to reference cs_clients instead of cs_users
-- First, check if we need to alter the foreign key
DO $$
BEGIN
    -- Check if the constraint exists and references cs_users
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'cs_bookings_client_id_fkey'
        AND table_name = 'cs_bookings'
    ) THEN
        -- Drop the old constraint
        ALTER TABLE public.cs_bookings DROP CONSTRAINT IF EXISTS cs_bookings_client_id_fkey;

        -- Add new constraint referencing cs_clients
        ALTER TABLE public.cs_bookings
        ADD CONSTRAINT cs_bookings_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES public.cs_clients(id);
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.cs_clients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own client profile
CREATE POLICY "Users can view own client profile"
    ON public.cs_clients
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own client profile
CREATE POLICY "Users can insert own client profile"
    ON public.cs_clients
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own client profile
CREATE POLICY "Users can update own client profile"
    ON public.cs_clients
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Coaches can view client profiles of their bookings
CREATE POLICY "Coaches can view their clients"
    ON public.cs_clients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_bookings b
            JOIN public.cs_coaches c ON c.id = b.coach_id
            WHERE b.client_id = cs_clients.id
            AND c.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.cs_clients TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Add helpful comment
COMMENT ON TABLE public.cs_clients IS
'Extended client profiles. Links to cs_users via user_id. Contains client-specific preferences and statistics.';

COMMENT ON COLUMN public.cs_clients.user_id IS
'References the auth user. One-to-one relationship with cs_users.';
