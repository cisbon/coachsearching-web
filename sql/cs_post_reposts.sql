-- =============================================
-- cs_post_reposts - Users can repost posts to their activity feed
-- Any authenticated user (coach, client, or business) can repost.
-- =============================================

CREATE TABLE IF NOT EXISTS cs_post_reposts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES cs_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reposted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(post_id, user_id)
);

-- Index for fast lookups by user (activity feed)
CREATE INDEX IF NOT EXISTS idx_post_reposts_user_id ON cs_post_reposts(user_id);
-- Index for fast lookups by post
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_id ON cs_post_reposts(post_id);

-- Enable Row Level Security
ALTER TABLE cs_post_reposts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reposts (needed to show repost counts, activity feeds, etc.)
CREATE POLICY "Anyone can read reposts"
    ON cs_post_reposts FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert their own reposts
-- user_id must match auth.uid() so users can only repost as themselves
CREATE POLICY "Users can repost posts"
    ON cs_post_reposts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own reposts only
CREATE POLICY "Users can remove their own reposts"
    ON cs_post_reposts FOR DELETE
    USING (auth.uid() = user_id);
