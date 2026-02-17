-- =============================================
-- cs_privacy - User privacy settings
-- Controls visibility of each profile section.
-- Visibility values: 'all' (public), 'members' (signed-in users), 'connections' (connected users only)
-- One row per user, created on first visit to settings page.
-- =============================================

CREATE TABLE IF NOT EXISTS cs_privacy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    -- Profile section visibility settings
    -- Each can be: 'all', 'members', 'connections'
    visibility_main_info TEXT NOT NULL DEFAULT 'all' CHECK (visibility_main_info IN ('all', 'members', 'connections')),
    visibility_avatar_banner TEXT NOT NULL DEFAULT 'all' CHECK (visibility_avatar_banner IN ('all', 'members', 'connections')),
    visibility_activities TEXT NOT NULL DEFAULT 'all' CHECK (visibility_activities IN ('all', 'members', 'connections')),
    visibility_highlights TEXT NOT NULL DEFAULT 'all' CHECK (visibility_highlights IN ('all', 'members', 'connections')),
    visibility_recommendations TEXT NOT NULL DEFAULT 'all' CHECK (visibility_recommendations IN ('all', 'members', 'connections')),
    visibility_experience TEXT NOT NULL DEFAULT 'all' CHECK (visibility_experience IN ('all', 'members', 'connections')),
    visibility_education TEXT NOT NULL DEFAULT 'all' CHECK (visibility_education IN ('all', 'members', 'connections')),
    visibility_certifications TEXT NOT NULL DEFAULT 'all' CHECK (visibility_certifications IN ('all', 'members', 'connections')),
    visibility_skills TEXT NOT NULL DEFAULT 'all' CHECK (visibility_skills IN ('all', 'members', 'connections')),
    visibility_volunteering TEXT NOT NULL DEFAULT 'all' CHECK (visibility_volunteering IN ('all', 'members', 'connections')),
    visibility_publications TEXT NOT NULL DEFAULT 'all' CHECK (visibility_publications IN ('all', 'members', 'connections')),
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_privacy_user_id ON cs_privacy(user_id);

-- Enable Row Level Security
ALTER TABLE cs_privacy ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read privacy settings (needed to enforce visibility on profiles)
CREATE POLICY "Anyone can read privacy settings"
    ON cs_privacy FOR SELECT
    USING (true);

-- Policy: Users can insert their own privacy settings
CREATE POLICY "Users can create their own privacy settings"
    ON cs_privacy FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own privacy settings
CREATE POLICY "Users can update their own privacy settings"
    ON cs_privacy FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own privacy settings
CREATE POLICY "Users can delete their own privacy settings"
    ON cs_privacy FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_privacy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER privacy_updated_at
    BEFORE UPDATE ON cs_privacy
    FOR EACH ROW
    EXECUTE FUNCTION update_privacy_updated_at();
