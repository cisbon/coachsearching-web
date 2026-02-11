-- =============================================
-- cs_post_highlights - Users can highlight/star posts
-- Any authenticated user (coach, client, or business) can highlight posts.
-- =============================================

CREATE TABLE IF NOT EXISTS cs_post_highlights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES cs_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    highlighted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(post_id, user_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_post_highlights_user_id ON cs_post_highlights(user_id);
-- Index for fast lookups by post
CREATE INDEX IF NOT EXISTS idx_post_highlights_post_id ON cs_post_highlights(post_id);

-- Enable Row Level Security
ALTER TABLE cs_post_highlights ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read highlights (needed to show filled star, featured sections, etc.)
CREATE POLICY "Anyone can read highlights"
    ON cs_post_highlights FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert their own highlights
-- user_id must match auth.uid() so users can only highlight as themselves
CREATE POLICY "Users can highlight posts"
    ON cs_post_highlights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own highlights only
CREATE POLICY "Users can remove their own highlights"
    ON cs_post_highlights FOR DELETE
    USING (auth.uid() = user_id);
