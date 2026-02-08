-- ============================================================================
-- cs_coach_experiences - FIX RLS policies
-- Run this in the Supabase SQL Editor if you get RLS policy errors
-- ============================================================================

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Coach experiences are viewable by everyone" ON public.cs_coach_experiences;
DROP POLICY IF EXISTS "Coaches can insert own experiences" ON public.cs_coach_experiences;
DROP POLICY IF EXISTS "Coaches can update own experiences" ON public.cs_coach_experiences;
DROP POLICY IF EXISTS "Coaches can delete own experiences" ON public.cs_coach_experiences;

-- Ensure RLS is enabled
ALTER TABLE public.cs_coach_experiences ENABLE ROW LEVEL SECURITY;

-- Everyone can read experiences
CREATE POLICY "Coach experiences are viewable by everyone"
    ON public.cs_coach_experiences FOR SELECT USING (true);

-- Coaches can insert their own experiences (coach_id must match auth.uid())
CREATE POLICY "Coaches can insert own experiences"
    ON public.cs_coach_experiences FOR INSERT
    WITH CHECK (coach_id = (SELECT auth.uid()));

-- Coaches can update their own experiences
CREATE POLICY "Coaches can update own experiences"
    ON public.cs_coach_experiences FOR UPDATE
    USING (coach_id = (SELECT auth.uid()));

-- Coaches can delete their own experiences
CREATE POLICY "Coaches can delete own experiences"
    ON public.cs_coach_experiences FOR DELETE
    USING (coach_id = (SELECT auth.uid()));
