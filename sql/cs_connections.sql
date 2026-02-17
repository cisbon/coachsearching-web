-- =============================================
-- cs_connections - User connections to coaches
-- Any authenticated user (client, coach, or business) can connect with coaches.
-- user_id = the user initiating the connection (client, coach, or business)
-- coach_id = the coach being connected to (references cs_coaches.user_id, NOT cs_coaches.id)
-- =============================================

CREATE TABLE IF NOT EXISTS cs_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connected_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'denied')),
    UNIQUE(user_id, coach_id)
);

-- Index for fast lookups by user (who did I connect to?)
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON cs_connections(user_id);
-- Index for fast lookups by coach (who connected to me?)
CREATE INDEX IF NOT EXISTS idx_connections_coach_id ON cs_connections(coach_id);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_connections_status ON cs_connections(status);

-- Enable Row Level Security
ALTER TABLE cs_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own sent connections (where they are user_id)
CREATE POLICY "Users can read their own connections"
    ON cs_connections FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Coaches can read connections sent to them (where they are coach_id)
CREATE POLICY "Coaches can read connections to them"
    ON cs_connections FOR SELECT
    USING (auth.uid() = coach_id);

-- Policy: Authenticated users can create connections as themselves
-- user_id must match auth.uid() so users can only create connections from their own account
CREATE POLICY "Users can create connections as themselves"
    ON cs_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Coaches can update connection status for connections sent to them
-- Only the coach (coach_id) can grant or deny a connection request
CREATE POLICY "Coaches can update connection status"
    ON cs_connections FOR UPDATE
    USING (auth.uid() = coach_id);

-- Policy: Users can delete their own sent connections (withdraw request)
CREATE POLICY "Users can delete their own connections"
    ON cs_connections FOR DELETE
    USING (auth.uid() = user_id);
