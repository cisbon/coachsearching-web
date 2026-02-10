-- ============================================================================
-- Feed Tables + Storage Bucket
-- Run this in the Supabase SQL Editor
-- Creates: cs_posts, cs_post_likes, cs_post_comments
-- Storage: feed-media bucket (images only, no video uploads)
-- ============================================================================

-- ============================================================================
-- 1. cs_posts - Feed posts
-- ============================================================================
CREATE TABLE public.cs_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,  -- embedded video links only (YouTube, Vimeo, Dailymotion, etc.)
    author_name TEXT,
    author_avatar TEXT,
    author_title TEXT,
    author_slug TEXT,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_posts_user ON public.cs_posts(user_id);
CREATE INDEX idx_posts_created ON public.cs_posts(created_at DESC);

-- Grant permissions
GRANT SELECT ON public.cs_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cs_posts TO authenticated;

-- Enable RLS
ALTER TABLE public.cs_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Posts are viewable by everyone"
    ON public.cs_posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
    ON public.cs_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
    ON public.cs_posts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
    ON public.cs_posts FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_timestamp
    BEFORE UPDATE ON public.cs_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_updated_at();

-- ============================================================================
-- 2. cs_post_likes - Post likes (one per user per post)
-- ============================================================================
CREATE TABLE public.cs_post_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.cs_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON public.cs_post_likes(post_id);
CREATE INDEX idx_post_likes_user ON public.cs_post_likes(user_id);

-- Grant permissions
GRANT SELECT ON public.cs_post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.cs_post_likes TO authenticated;

-- Enable RLS
ALTER TABLE public.cs_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Post likes are viewable by everyone"
    ON public.cs_post_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like posts"
    ON public.cs_post_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike (delete own likes)"
    ON public.cs_post_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update likes_count on cs_posts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.cs_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.cs_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_likes_count
    AFTER INSERT OR DELETE ON public.cs_post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_likes_count();

-- ============================================================================
-- 3. cs_post_comments - Post comments
-- ============================================================================
CREATE TABLE public.cs_post_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.cs_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT,
    author_avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_post_comments_post ON public.cs_post_comments(post_id);
CREATE INDEX idx_post_comments_user ON public.cs_post_comments(user_id);

-- Grant permissions
GRANT SELECT ON public.cs_post_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cs_post_comments TO authenticated;

-- Enable RLS
ALTER TABLE public.cs_post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Post comments are viewable by everyone"
    ON public.cs_post_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment"
    ON public.cs_post_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
    ON public.cs_post_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON public.cs_post_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update comments_count on cs_posts
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.cs_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.cs_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_comments_count
    AFTER INSERT OR DELETE ON public.cs_post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comments_count();

-- Auto-update updated_at for comments
CREATE TRIGGER update_post_comment_timestamp
    BEFORE UPDATE ON public.cs_post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_updated_at();

-- ============================================================================
-- 4. Storage Bucket: feed-media (images only)
-- Videos should be embedded via URL (YouTube, Vimeo, Dailymotion, etc.)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'feed-media',
    'feed-media',
    true,
    5242880,  -- 5MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Storage RLS Policies
CREATE POLICY "Anyone can view feed media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'feed-media');

CREATE POLICY "Authenticated users can upload feed media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'feed-media'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update own feed media"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'feed-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own feed media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'feed-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
