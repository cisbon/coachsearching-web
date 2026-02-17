-- =============================================
-- cs_settings - User account settings
-- Stores email notification preferences and other account settings.
-- One row per user, created on first visit to settings page.
-- =============================================

CREATE TABLE IF NOT EXISTS cs_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    -- Email notification preferences
    notify_connection_requests BOOLEAN NOT NULL DEFAULT true,
    notify_messages BOOLEAN NOT NULL DEFAULT true,
    notify_recommendations BOOLEAN NOT NULL DEFAULT true,
    notify_discovery_calls BOOLEAN NOT NULL DEFAULT true,
    notify_platform_updates BOOLEAN NOT NULL DEFAULT true,
    notify_marketing BOOLEAN NOT NULL DEFAULT false,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON cs_settings(user_id);

-- Enable Row Level Security
ALTER TABLE cs_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own settings
CREATE POLICY "Users can read their own settings"
    ON cs_settings FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own settings
CREATE POLICY "Users can create their own settings"
    ON cs_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own settings
CREATE POLICY "Users can update their own settings"
    ON cs_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own settings
CREATE POLICY "Users can delete their own settings"
    ON cs_settings FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
    BEFORE UPDATE ON cs_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();
