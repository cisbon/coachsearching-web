-- =====================================================
-- ADMIN BLOG POSTS TABLE
-- Marketing/SEO blog managed by admin users only
-- Supports multilingual posts with unique URLs per language
-- =====================================================

-- Create blog post status enum if not exists
DO $$ BEGIN
    CREATE TYPE cs_blog_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main blog posts table
CREATE TABLE IF NOT EXISTS public.cs_blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT, -- Short excerpt/description for previews
    body TEXT NOT NULL, -- HTML content from WYSIWYG editor

    -- Media
    featured_image_url TEXT,
    featured_image_alt TEXT,

    -- Categorization
    tags TEXT[] DEFAULT '{}', -- Array of tags for filtering/SEO

    -- Multilingual support
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    post_group_id UUID DEFAULT gen_random_uuid(), -- Links translations together

    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,

    -- Publishing
    status cs_blog_status DEFAULT 'draft',
    published_at TIMESTAMPTZ,

    -- Author tracking (admin who created/updated)
    author_id UUID REFERENCES public.cs_users(id),

    -- Stats
    view_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT cs_blog_posts_language_slug_unique UNIQUE (language, slug)
);

-- Set post_group_id to id for existing rows (self-reference for non-translations)
-- This ensures each post has a group_id even if it's standalone

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for listing published posts
CREATE INDEX IF NOT EXISTS idx_cs_blog_posts_status_published
    ON public.cs_blog_posts(status, published_at DESC)
    WHERE status = 'published';

-- Index for language-based queries
CREATE INDEX IF NOT EXISTS idx_cs_blog_posts_language
    ON public.cs_blog_posts(language);

-- Index for finding translations
CREATE INDEX IF NOT EXISTS idx_cs_blog_posts_group_id
    ON public.cs_blog_posts(post_group_id);

-- Index for tag-based queries (GIN index for array)
CREATE INDEX IF NOT EXISTS idx_cs_blog_posts_tags
    ON public.cs_blog_posts USING GIN(tags);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_cs_blog_posts_slug
    ON public.cs_blog_posts(slug);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.cs_blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "Published blog posts are viewable by everyone"
    ON public.cs_blog_posts FOR SELECT
    USING (status = 'published');

-- Only admins can view all posts (including drafts)
CREATE POLICY "Admins can view all blog posts"
    ON public.cs_blog_posts FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.cs_users WHERE user_type = 'admin'
        )
    );

-- Only admins can insert posts
CREATE POLICY "Admins can create blog posts"
    ON public.cs_blog_posts FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.cs_users WHERE user_type = 'admin'
        )
    );

-- Only admins can update posts
CREATE POLICY "Admins can update blog posts"
    ON public.cs_blog_posts FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM public.cs_users WHERE user_type = 'admin'
        )
    );

-- Only admins can delete posts
CREATE POLICY "Admins can delete blog posts"
    ON public.cs_blog_posts FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM public.cs_users WHERE user_type = 'admin'
        )
    );

-- =====================================================
-- VIEWS
-- =====================================================

-- View for blog posts with translation info
CREATE OR REPLACE VIEW public.v_blog_posts_with_translations AS
SELECT
    bp.*,
    u.email as author_email,
    (
        SELECT json_agg(json_build_object(
            'id', t.id,
            'language', t.language,
            'slug', t.slug,
            'title', t.title
        ))
        FROM public.cs_blog_posts t
        WHERE t.post_group_id = bp.post_group_id
        AND t.id != bp.id
        AND t.status = 'published'
    ) as translations
FROM public.cs_blog_posts bp
LEFT JOIN public.cs_users u ON bp.author_id = u.id;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get related posts by tags
CREATE OR REPLACE FUNCTION public.get_related_blog_posts(
    p_post_id UUID,
    p_language VARCHAR(5) DEFAULT 'en',
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    description TEXT,
    featured_image_url TEXT,
    tags TEXT[],
    published_at TIMESTAMPTZ,
    view_count INTEGER,
    matching_tags INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH current_post AS (
        SELECT bp.tags, bp.post_group_id
        FROM public.cs_blog_posts bp
        WHERE bp.id = p_post_id
    )
    SELECT
        bp.id,
        bp.title,
        bp.slug,
        bp.description,
        bp.featured_image_url,
        bp.tags,
        bp.published_at,
        bp.view_count,
        (
            SELECT COUNT(*)::INTEGER
            FROM unnest(bp.tags) t
            WHERE t = ANY((SELECT tags FROM current_post))
        ) as matching_tags
    FROM public.cs_blog_posts bp
    WHERE bp.status = 'published'
    AND bp.language = p_language
    AND bp.id != p_post_id
    AND bp.post_group_id != (SELECT post_group_id FROM current_post)
    ORDER BY matching_tags DESC, bp.published_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_blog_view_count(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.cs_blog_posts
    SET view_count = view_count + 1
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FOR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_blog_post_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_blog_post_timestamp ON public.cs_blog_posts;
CREATE TRIGGER trigger_update_blog_post_timestamp
    BEFORE UPDATE ON public.cs_blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_blog_post_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.cs_blog_posts IS 'Admin-managed blog posts for marketing and SEO';
COMMENT ON COLUMN public.cs_blog_posts.language IS 'ISO 639-1 language code (en, de, es, fr, it)';
COMMENT ON COLUMN public.cs_blog_posts.post_group_id IS 'Groups translations together - posts with same group_id are translations of each other';
COMMENT ON COLUMN public.cs_blog_posts.tags IS 'Array of tags for categorization and related posts';
COMMENT ON COLUMN public.cs_blog_posts.body IS 'HTML content from WYSIWYG editor';
