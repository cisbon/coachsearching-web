-- ============================================
-- Migration: Add LinkedIn URL and Video URL columns to cs_coaches
-- Date: 2024-12-08
-- Description: Adds linkedin_url and intro_video_url columns to support
--              coach profile enhancements for trust building features
-- ============================================

-- Add linkedin_url column for coach LinkedIn profile links
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add intro_video_url column for coach video introductions
-- This is a key trust-building feature - coaches with videos are prioritized in search
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- Add website_url column if it doesn't exist
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add banner_url column for profile banner images
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Add location_city and location_country for better location handling
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS location_city TEXT;

ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS location_country TEXT;

-- Add years_experience for coach experience tracking
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0;

-- Add session format preferences
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS offers_virtual BOOLEAN DEFAULT true;

ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS offers_onsite BOOLEAN DEFAULT false;

-- Add onboarding_completed flag
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- ============================================
-- Optional: Create index for video URL to optimize queries
-- that filter/sort by coaches with videos
-- ============================================

-- Create index to speed up queries filtering by video availability
CREATE INDEX IF NOT EXISTS idx_cs_coaches_has_video
ON cs_coaches ((intro_video_url IS NOT NULL));

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON COLUMN cs_coaches.linkedin_url IS 'LinkedIn profile URL for the coach';
COMMENT ON COLUMN cs_coaches.intro_video_url IS 'URL to coach intro video (YouTube, Vimeo, etc). Coaches with videos are prioritized in search results.';
COMMENT ON COLUMN cs_coaches.website_url IS 'Coach personal or business website URL';
COMMENT ON COLUMN cs_coaches.banner_url IS 'Profile banner/header image URL';
COMMENT ON COLUMN cs_coaches.location_city IS 'City where coach is based';
COMMENT ON COLUMN cs_coaches.location_country IS 'Country where coach is based';
COMMENT ON COLUMN cs_coaches.years_experience IS 'Years of coaching experience';
COMMENT ON COLUMN cs_coaches.offers_virtual IS 'Whether coach offers virtual/online sessions';
COMMENT ON COLUMN cs_coaches.offers_onsite IS 'Whether coach offers in-person sessions';
COMMENT ON COLUMN cs_coaches.onboarding_completed IS 'Whether coach has completed profile onboarding';

-- ============================================
-- Verify the changes (run this to check)
-- ============================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'cs_coaches'
-- ORDER BY ordinal_position;
