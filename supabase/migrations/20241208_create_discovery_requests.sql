-- Migration: Create cs_discovery_requests table for simple discovery call requests
-- Date: 2024-12-08
-- Description: Simple table for storing discovery call callback requests
-- Users provide name, phone, and general time preference - no specific slot booking

-- Create the discovery requests table
CREATE TABLE IF NOT EXISTS cs_discovery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES cs_coaches(id) ON DELETE CASCADE,

    -- Client information
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    client_email VARCHAR(255), -- Optional email
    client_message TEXT, -- Optional message

    -- Time preference (general, not specific slot)
    time_preference VARCHAR(50) NOT NULL,
    -- Values: 'weekday_morning', 'weekday_afternoon', 'weekday_evening',
    --         'weekend_morning', 'weekend_afternoon', 'flexible'

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending',
    -- Values: 'pending', 'contacted', 'scheduled', 'completed', 'cancelled'

    -- Coach notes (for their own tracking)
    coach_notes TEXT,

    -- Notification tracking
    email_sent_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_discovery_requests_coach_id ON cs_discovery_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_discovery_requests_status ON cs_discovery_requests(status);
CREATE INDEX IF NOT EXISTS idx_discovery_requests_created_at ON cs_discovery_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE cs_discovery_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (create a request) - no login required
CREATE POLICY "Anyone can create discovery requests"
ON cs_discovery_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Coaches can view their own requests
CREATE POLICY "Coaches can view their own discovery requests"
ON cs_discovery_requests
FOR SELECT
TO authenticated
USING (
    coach_id IN (
        SELECT id FROM cs_coaches WHERE user_id = auth.uid()
    )
);

-- Policy: Coaches can update their own requests (status, notes)
CREATE POLICY "Coaches can update their own discovery requests"
ON cs_discovery_requests
FOR UPDATE
TO authenticated
USING (
    coach_id IN (
        SELECT id FROM cs_coaches WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    coach_id IN (
        SELECT id FROM cs_coaches WHERE user_id = auth.uid()
    )
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discovery_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_discovery_request_timestamp ON cs_discovery_requests;
CREATE TRIGGER trigger_update_discovery_request_timestamp
    BEFORE UPDATE ON cs_discovery_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_discovery_request_timestamp();

-- Comment for documentation
COMMENT ON TABLE cs_discovery_requests IS 'Simple discovery call requests - users provide name, phone, time preference for coach to call back';
COMMENT ON COLUMN cs_discovery_requests.time_preference IS 'General time preference: weekday_morning, weekday_afternoon, weekday_evening, weekend_morning, weekend_afternoon, flexible';
COMMENT ON COLUMN cs_discovery_requests.status IS 'Request status: pending, contacted, scheduled, completed, cancelled';
