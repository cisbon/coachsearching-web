-- ============================================================================
-- cs_coach_publications table
-- Run this in the Supabase SQL Editor
-- ============================================================================

CREATE TABLE public.cs_coach_publications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_en TEXT,
    publisher TEXT,
    publication_date DATE,
    authors TEXT,
    publication_url TEXT,
    description TEXT,
    description_en TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coach_publications_coach ON public.cs_coach_publications(coach_id);

-- Grant permissions
GRANT SELECT ON public.cs_coach_publications TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cs_coach_publications TO authenticated;

-- Enable RLS
ALTER TABLE public.cs_coach_publications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (coach_id -> cs_coaches.id, check via cs_coaches.user_id)
CREATE POLICY "Coach publications are viewable by everyone"
    ON public.cs_coach_publications FOR SELECT USING (true);

CREATE POLICY "Coaches can insert own publications"
    ON public.cs_coach_publications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Coaches can update own publications"
    ON public.cs_coach_publications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Coaches can delete own publications"
    ON public.cs_coach_publications FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_coach_publication_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_publication_timestamp
    BEFORE UPDATE ON public.cs_coach_publications
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_publication_updated_at();
