-- ============================================================================
-- cs_coach_experiences - FIX RLS policies
-- Run this in the Supabase SQL Editor
--
-- The coach_id column references cs_coaches.id which is NOT the same as
-- auth.uid(). The auth user ID is stored in cs_coaches.user_id.
-- So we must check through the cs_coaches table.
-- ============================================================================

-- Grant table-level permissions
GRANT SELECT ON public.cs_coach_experiences TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cs_coach_experiences TO authenticated;

-- Drop existing policies
DROP POLICY IF EXISTS "Coach experiences are viewable by everyone" ON public.cs_coach_experiences;
DROP POLICY IF EXISTS "Coaches can insert own experiences" ON public.cs_coach_experiences;
DROP POLICY IF EXISTS "Coaches can update own experiences" ON public.cs_coach_experiences;
DROP POLICY IF EXISTS "Coaches can delete own experiences" ON public.cs_coach_experiences;

-- Ensure RLS is enabled
ALTER TABLE public.cs_coach_experiences ENABLE ROW LEVEL SECURITY;

-- Everyone can read experiences
CREATE POLICY "Coach experiences are viewable by everyone"
    ON public.cs_coach_experiences FOR SELECT USING (true);

-- Coaches can insert their own experiences
CREATE POLICY "Coaches can insert own experiences"
    ON public.cs_coach_experiences FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

-- Coaches can update their own experiences
CREATE POLICY "Coaches can update own experiences"
    ON public.cs_coach_experiences FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

-- Coaches can delete their own experiences
CREATE POLICY "Coaches can delete own experiences"
    ON public.cs_coach_experiences FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );
