-- ============================================================================
-- cs_coach_experiences table
-- Stores individual experience entries for coaches
-- Run this in the Supabase SQL Editor
-- ============================================================================

CREATE TABLE public.cs_coach_experiences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_en TEXT,
    employment_type TEXT CHECK (employment_type IN ('Full-Time', 'Part-Time', 'Self-Employed')),
    organization TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    location TEXT,
    description TEXT,
    description_en TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by coach_id
CREATE INDEX idx_coach_experiences_coach ON public.cs_coach_experiences(coach_id);

-- Enable RLS
ALTER TABLE public.cs_coach_experiences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read experiences
CREATE POLICY "Coach experiences are viewable by everyone"
    ON public.cs_coach_experiences FOR SELECT USING (true);

-- Coaches can insert their own experiences
CREATE POLICY "Coaches can insert own experiences"
    ON public.cs_coach_experiences FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = coach_id);

-- Coaches can update their own experiences
CREATE POLICY "Coaches can update own experiences"
    ON public.cs_coach_experiences FOR UPDATE
    USING ((SELECT auth.uid()) = coach_id);

-- Coaches can delete their own experiences
CREATE POLICY "Coaches can delete own experiences"
    ON public.cs_coach_experiences FOR DELETE
    USING ((SELECT auth.uid()) = coach_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coach_experience_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_experience_timestamp
    BEFORE UPDATE ON public.cs_coach_experiences
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_experience_updated_at();
