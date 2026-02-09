-- ============================================================================
-- cs_coach_skills + cs_coach_skills_commendations tables
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- Skills table
CREATE TABLE public.cs_coach_skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    skill_en TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coach_skills_coach ON public.cs_coach_skills(coach_id);

-- Commendations table (endorsements from other users)
CREATE TABLE public.cs_coach_skills_commendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_skill_id UUID NOT NULL REFERENCES public.cs_coach_skills(id) ON DELETE CASCADE,
    commendation_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    show_commendation BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_skill_id, commendation_user_id)
);

CREATE INDEX idx_skill_commendations_skill ON public.cs_coach_skills_commendations(coach_skill_id);
CREATE INDEX idx_skill_commendations_user ON public.cs_coach_skills_commendations(commendation_user_id);

-- Grant permissions
GRANT SELECT ON public.cs_coach_skills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cs_coach_skills TO authenticated;

GRANT SELECT ON public.cs_coach_skills_commendations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cs_coach_skills_commendations TO authenticated;

-- Enable RLS
ALTER TABLE public.cs_coach_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coach_skills_commendations ENABLE ROW LEVEL SECURITY;

-- =====================
-- cs_coach_skills RLS
-- =====================

CREATE POLICY "Coach skills are viewable by everyone"
    ON public.cs_coach_skills FOR SELECT USING (true);

CREATE POLICY "Coaches can insert own skills"
    ON public.cs_coach_skills FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Coaches can update own skills"
    ON public.cs_coach_skills FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Coaches can delete own skills"
    ON public.cs_coach_skills FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

-- =====================================
-- cs_coach_skills_commendations RLS
-- =====================================

CREATE POLICY "Skill commendations are viewable by everyone"
    ON public.cs_coach_skills_commendations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert commendations"
    ON public.cs_coach_skills_commendations FOR INSERT
    WITH CHECK (commendation_user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own commendations"
    ON public.cs_coach_skills_commendations FOR UPDATE
    USING (commendation_user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own commendations"
    ON public.cs_coach_skills_commendations FOR DELETE
    USING (commendation_user_id = (SELECT auth.uid()));
