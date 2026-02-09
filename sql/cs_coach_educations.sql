-- ============================================================================
-- cs_coach_educations table
-- Stores individual education entries for coaches
-- Run this in the Supabase SQL Editor
-- ============================================================================

CREATE TABLE public.cs_coach_educations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    institute TEXT NOT NULL,
    degree TEXT,
    field_of_study TEXT NOT NULL,
    field_of_study_en TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    location TEXT,
    description TEXT,
    description_en TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by coach_id
CREATE INDEX idx_coach_educations_coach ON public.cs_coach_educations(coach_id);

-- Grant table-level permissions
GRANT SELECT ON public.cs_coach_educations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cs_coach_educations TO authenticated;

-- Enable RLS
ALTER TABLE public.cs_coach_educations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- NOTE: coach_id references cs_coaches.id which is NOT auth.uid().
-- The auth user ID is in cs_coaches.user_id, so we check via subquery.

-- Everyone can read educations
CREATE POLICY "Coach educations are viewable by everyone"
    ON public.cs_coach_educations FOR SELECT USING (true);

-- Coaches can insert their own educations
CREATE POLICY "Coaches can insert own educations"
    ON public.cs_coach_educations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

-- Coaches can update their own educations
CREATE POLICY "Coaches can update own educations"
    ON public.cs_coach_educations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

-- Coaches can delete their own educations
CREATE POLICY "Coaches can delete own educations"
    ON public.cs_coach_educations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coach_education_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_education_timestamp
    BEFORE UPDATE ON public.cs_coach_educations
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_education_updated_at();
