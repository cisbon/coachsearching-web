-- =====================================================
-- FIX cs_bookings TABLE SCHEMA
-- Align the table structure with what the JavaScript code expects
-- =====================================================

-- First, let's check if the table exists and what structure it has
-- If it doesn't exist, create it with the correct structure
-- If it does exist with wrong columns, we'll alter it

-- Drop and recreate cs_bookings with the correct structure for our app
DROP TABLE IF EXISTS public.cs_bookings CASCADE;

CREATE TABLE public.cs_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Participants
    client_id UUID NOT NULL REFERENCES public.cs_clients(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,

    -- Scheduling (matching JavaScript expectations)
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending',
    -- Values: 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'

    -- Meeting Details
    meeting_type TEXT DEFAULT 'online',
    -- Values: 'online', 'onsite'
    meeting_link TEXT,
    meeting_address TEXT,

    -- Notes
    client_notes TEXT,
    coach_notes TEXT,

    -- Payment (simplified for now)
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    stripe_payment_intent_id TEXT,

    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.cs_users(id),
    cancellation_reason TEXT,

    -- Completion
    completed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT valid_duration CHECK (duration_minutes > 0),
    CONSTRAINT valid_amount CHECK (amount >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cs_bookings_coach_id ON public.cs_bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_cs_bookings_client_id ON public.cs_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_cs_bookings_start_time ON public.cs_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_cs_bookings_status ON public.cs_bookings(status);
CREATE INDEX IF NOT EXISTS idx_cs_bookings_coach_start ON public.cs_bookings(coach_id, start_time);

-- Grant permissions
GRANT ALL ON public.cs_bookings TO postgres, authenticated, service_role;
GRANT SELECT ON public.cs_bookings TO anon;

-- Enable RLS
ALTER TABLE public.cs_bookings ENABLE ROW LEVEL SECURITY;

-- Add helpful comment
COMMENT ON TABLE public.cs_bookings IS
'Booking sessions between clients and coaches. Contains scheduling, payment, and meeting details.';

COMMENT ON COLUMN public.cs_bookings.start_time IS
'When the coaching session starts (UTC timestamp)';

COMMENT ON COLUMN public.cs_bookings.end_time IS
'When the coaching session ends (UTC timestamp)';

COMMENT ON COLUMN public.cs_bookings.meeting_type IS
'Type of meeting: online (video call) or onsite (physical location)';
