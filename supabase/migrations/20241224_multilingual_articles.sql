-- =====================================================
-- MULTILINGUAL ARTICLES SUPPORT
-- Adds language support for articles with unique URLs per language
-- =====================================================

-- Add language column to cs_articles
ALTER TABLE public.cs_articles
ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';

-- Add article_group_id to link translations together
-- Articles with the same article_group_id are translations of each other
ALTER TABLE public.cs_articles
ADD COLUMN IF NOT EXISTS article_group_id UUID DEFAULT uuid_generate_v4();

-- Set article_group_id for existing articles (each gets its own group initially)
UPDATE public.cs_articles
SET article_group_id = id
WHERE article_group_id IS NULL;

-- Make article_group_id NOT NULL after setting defaults
ALTER TABLE public.cs_articles
ALTER COLUMN article_group_id SET NOT NULL;

-- Drop the old unique constraint
ALTER TABLE public.cs_articles
DROP CONSTRAINT IF EXISTS cs_articles_coach_id_slug_key;

-- Create new unique constraint: one slug per coach per language
ALTER TABLE public.cs_articles
ADD CONSTRAINT cs_articles_coach_id_language_slug_key UNIQUE (coach_id, language, slug);

-- Create index for faster language-based queries
CREATE INDEX IF NOT EXISTS idx_cs_articles_language ON public.cs_articles(language);

-- Create index for finding translations
CREATE INDEX IF NOT EXISTS idx_cs_articles_article_group_id ON public.cs_articles(article_group_id);

-- Create index for public blog queries (status + language)
CREATE INDEX IF NOT EXISTS idx_cs_articles_status_language ON public.cs_articles(status, language);

-- =====================================================
-- VIEW: Get articles with translation info
-- =====================================================
CREATE OR REPLACE VIEW public.v_articles_with_translations AS
SELECT
    a.*,
    c.full_name as author_name,
    c.avatar_url as author_avatar,
    c.title as author_title,
    c.slug as author_slug,
    (
        SELECT json_agg(json_build_object(
            'language', t.language,
            'slug', t.slug,
            'title', t.title
        ))
        FROM public.cs_articles t
        WHERE t.article_group_id = a.article_group_id
        AND t.id != a.id
        AND t.status = 'published'
    ) as translations
FROM public.cs_articles a
JOIN public.cs_coaches c ON a.coach_id = c.id;

-- =====================================================
-- FUNCTION: Get article by language with fallback
-- Returns article in requested language, or fallback to English
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_article_by_slug(
    p_slug TEXT,
    p_language VARCHAR(5) DEFAULT 'en'
)
RETURNS TABLE (
    id UUID,
    coach_id UUID,
    title TEXT,
    slug TEXT,
    content_html TEXT,
    excerpt TEXT,
    featured_image_url TEXT,
    status cs_article_status,
    meta_title TEXT,
    meta_description TEXT,
    view_count INTEGER,
    published_at TIMESTAMPTZ,
    language VARCHAR(5),
    article_group_id UUID,
    author_name TEXT,
    author_avatar TEXT,
    author_title TEXT,
    author_slug TEXT,
    translations JSON
) AS $$
BEGIN
    -- First try to find article in requested language
    RETURN QUERY
    SELECT * FROM public.v_articles_with_translations v
    WHERE v.slug = p_slug
    AND v.language = p_language
    AND v.status = 'published'
    LIMIT 1;

    -- If not found, no fallback (404)
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES UPDATE
-- =====================================================
-- Public can read published articles in any language
DROP POLICY IF EXISTS "Published articles are viewable by everyone" ON public.cs_articles;
CREATE POLICY "Published articles are viewable by everyone"
    ON public.cs_articles FOR SELECT
    USING (status = 'published');

-- Coaches can manage their own articles in any language
DROP POLICY IF EXISTS "Coaches can manage own articles" ON public.cs_articles;
CREATE POLICY "Coaches can manage own articles"
    ON public.cs_articles FOR ALL
    USING (
        coach_id IN (
            SELECT id FROM public.cs_coaches
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON COLUMN public.cs_articles.language IS 'ISO 639-1 language code (en, de, es, fr, it)';
COMMENT ON COLUMN public.cs_articles.article_group_id IS 'Groups translations together - articles with same group_id are translations of each other';
