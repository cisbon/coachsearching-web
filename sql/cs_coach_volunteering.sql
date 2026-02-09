-- ============================================================================
-- cs_coach_volunteering table
-- Run this in the Supabase SQL Editor
-- ============================================================================

CREATE TABLE public.cs_coach_volunteering (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_en TEXT,
    organization TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    location TEXT,
    description TEXT,
    description_en TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coach_volunteering_coach ON public.cs_coach_volunteering(coach_id);

-- Grant permissions
GRANT SELECT ON public.cs_coach_volunteering TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cs_coach_volunteering TO authenticated;

-- Enable RLS
ALTER TABLE public.cs_coach_volunteering ENABLE ROW LEVEL SECURITY;

-- RLS Policies (coach_id -> cs_coaches.id, check via cs_coaches.user_id)
CREATE POLICY "Coach volunteering is viewable by everyone"
    ON public.cs_coach_volunteering FOR SELECT USING (true);

CREATE POLICY "Coaches can insert own volunteering"
    ON public.cs_coach_volunteering FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Coaches can update own volunteering"
    ON public.cs_coach_volunteering FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Coaches can delete own volunteering"
    ON public.cs_coach_volunteering FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_coach_volunteering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_volunteering_timestamp
    BEFORE UPDATE ON public.cs_coach_volunteering
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_volunteering_updated_at();
