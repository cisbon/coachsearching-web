-- =====================================================
-- QUICK FIX: Add missing columns to coaches table
-- Run this in Supabase SQL Editor to fix the schema
-- =====================================================

-- Add columns that the app expects but are missing
ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS languages TEXT[],
ADD COLUMN IF NOT EXISTS session_types TEXT[],
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_coaches_title ON public.coaches(title);
CREATE INDEX IF NOT EXISTS idx_coaches_location ON public.coaches(location);
CREATE INDEX IF NOT EXISTS idx_coaches_languages ON public.coaches USING GIN(languages);

-- Update the view to include new columns
DROP VIEW IF EXISTS coach_search_view;
CREATE OR REPLACE VIEW coach_search_view AS
SELECT
    c.*,
    COALESCE(c.average_rating, c.rating_average, 0) as rating,
    COALESCE(c.total_reviews, c.rating_count, 0) as reviews_count
FROM public.coaches c
WHERE c.onboarding_completed = TRUE;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.coaches TO authenticated;

-- =====================================================
-- INSTRUCTIONS:
-- =====================================================
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
-- 4. Refresh your CoachSearching app
-- 5. Try saving your profile again!
-- =====================================================
