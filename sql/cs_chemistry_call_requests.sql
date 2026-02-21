-- =============================================
-- cs_chemistry_call_requests
-- Stores chemistry/discovery call requests from users to coaches.
-- Created via the DiscoveryCallModal (both signed-in and guest users).
-- =============================================

CREATE TABLE IF NOT EXISTS cs_chemistry_call_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    specialties TEXT[] NOT NULL DEFAULT '{}',
    goal TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_chemistry_calls_user_id ON cs_chemistry_call_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_chemistry_calls_coach_id ON cs_chemistry_call_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_chemistry_calls_status ON cs_chemistry_call_requests(status);
CREATE INDEX IF NOT EXISTS idx_chemistry_calls_created_at ON cs_chemistry_call_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE cs_chemistry_call_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own sent requests
CREATE POLICY "Users can read own chemistry call requests"
    ON cs_chemistry_call_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Coaches can read requests sent to them
CREATE POLICY "Coaches can read chemistry call requests to them"
    ON cs_chemistry_call_requests FOR SELECT
    USING (auth.uid() = coach_id);

-- Policy: Authenticated users can create requests (must be their own user_id)
CREATE POLICY "Users can create chemistry call requests"
    ON cs_chemistry_call_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Coaches can update status of requests sent to them
CREATE POLICY "Coaches can update chemistry call request status"
    ON cs_chemistry_call_requests FOR UPDATE
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_chemistry_call_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chemistry_call_updated_at
    BEFORE UPDATE ON cs_chemistry_call_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_chemistry_call_updated_at();
