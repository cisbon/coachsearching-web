-- ============================================================================
-- Migration: Schema Cleanup & Optimization
-- Date: 2024-12-16
-- Description: Removes unused tables, redundant columns, and simplifies schema
--
-- WARNING: This migration is DESTRUCTIVE. Backup your database first!
--
-- To backup: pg_dump -h <host> -U <user> -d <database> > backup.sql
-- To rollback: psql -h <host> -U <user> -d <database> < backup.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Data Migration (Before dropping columns)
-- ============================================================================

-- 1.1 Ensure session_types has data from offers_virtual/offers_onsite
UPDATE cs_coaches
SET session_types = ARRAY[]::text[]
WHERE session_types IS NULL;

UPDATE cs_coaches
SET session_types = array_append(session_types, 'online')
WHERE offers_virtual = true
  AND NOT ('online' = ANY(session_types));

UPDATE cs_coaches
SET session_types = array_append(session_types, 'in-person')
WHERE offers_onsite = true
  AND NOT ('in-person' = ANY(session_types));

-- 1.2 Ensure location_city/location_country have data from location field
-- Parse "City, Country" format if location exists but city/country don't
UPDATE cs_coaches
SET
  location_city = COALESCE(location_city, split_part(location, ',', 1)),
  location_country = COALESCE(location_country, NULLIF(trim(split_part(location, ',', 2)), ''))
WHERE location IS NOT NULL
  AND (location_city IS NULL OR location_country IS NULL);

-- 1.3 Ensure user_type has data from role enum
UPDATE cs_users
SET user_type = role::text
WHERE user_type IS NULL OR user_type = ''
  AND role IS NOT NULL;

-- ============================================================================
-- PHASE 1.5: Drop Dependent Views
-- ============================================================================

-- Drop views that depend on columns we're about to remove
DROP VIEW IF EXISTS cs_active_coaches CASCADE;
DROP VIEW IF EXISTS cs_coaches_with_location CASCADE;
DROP VIEW IF EXISTS cs_coach_search CASCADE;
DROP VIEW IF EXISTS cs_coach_listing CASCADE;

-- ============================================================================
-- PHASE 2: Drop Unused Tables
-- ============================================================================

-- 2.1 Drop tables with foreign key dependencies first (order matters)
DROP TABLE IF EXISTS cs_pro_bono_bookings CASCADE;
DROP TABLE IF EXISTS cs_pro_bono_slots CASCADE;
DROP TABLE IF EXISTS cs_messages CASCADE;
DROP TABLE IF EXISTS cs_conversations CASCADE;
DROP TABLE IF EXISTS cs_coach_availability_overrides CASCADE;
DROP TABLE IF EXISTS cs_coach_availability CASCADE;
DROP TABLE IF EXISTS cs_services CASCADE;
DROP TABLE IF EXISTS cs_invoices CASCADE;
DROP TABLE IF EXISTS cs_payouts CASCADE;
DROP TABLE IF EXISTS cs_refunds CASCADE;
DROP TABLE IF EXISTS cs_agreements CASCADE;
DROP TABLE IF EXISTS cs_reports CASCADE;
DROP TABLE IF EXISTS cs_audit_log CASCADE;
DROP TABLE IF EXISTS cs_search_history CASCADE;
DROP TABLE IF EXISTS cs_terms_acceptance CASCADE;
DROP TABLE IF EXISTS cs_data_export_requests CASCADE;
DROP TABLE IF EXISTS cs_account_deletion_requests CASCADE;
DROP TABLE IF EXISTS cs_email_captures CASCADE;
DROP TABLE IF EXISTS cs_credentials CASCADE;

-- 2.2 Drop duplicate referral system (keeping cs_referral_codes)
DROP TABLE IF EXISTS cs_referrals CASCADE;

-- 2.3 Drop legacy tables
DROP TABLE IF EXISTS coachsearching_coaches CASCADE;
DROP TABLE IF EXISTS coachsearching_invite_codes CASCADE;

-- ============================================================================
-- PHASE 3: Drop Redundant Columns from cs_coaches
-- ============================================================================

-- 3.1 Drop location (redundant with location_city + location_country)
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS location;

-- 3.2 Drop location_coordinates (geo search not implemented)
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS location_coordinates;

-- 3.3 Drop offers_virtual/offers_onsite (using session_types instead)
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS offers_virtual;
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS offers_onsite;

-- 3.4 Drop total_reviews (duplicate of rating_count)
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS total_reviews;

-- 3.5 Drop total_sessions (confusing, keeping total_sessions_completed)
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS total_sessions;

-- 3.6 Drop banner_url (not used in UI)
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS banner_url;

-- 3.7 Drop verification_badge_type (not used)
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS verification_badge_type;

-- 3.8 Drop booking-related fields (no booking system yet)
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS auto_accept_bookings;
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS buffer_time_minutes;
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS max_advance_booking_days;
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS cancellation_policy;

-- 3.9 Drop pro_bono_hours_total (pro bono feature removed)
ALTER TABLE cs_coaches DROP COLUMN IF EXISTS pro_bono_hours_total;

-- ============================================================================
-- PHASE 4: Drop Redundant Columns from cs_users
-- ============================================================================

-- 4.1 Drop role enum (using user_type text instead)
ALTER TABLE cs_users DROP COLUMN IF EXISTS role;

-- ============================================================================
-- PHASE 5: Drop Denormalized Columns from cs_clients (Optional)
-- Uncomment if you want to remove these - they're useful for query performance
-- ============================================================================

-- ALTER TABLE cs_clients DROP COLUMN IF EXISTS total_bookings;
-- ALTER TABLE cs_clients DROP COLUMN IF EXISTS total_completed_sessions;
-- ALTER TABLE cs_clients DROP COLUMN IF EXISTS total_amount_spent;
-- ALTER TABLE cs_clients DROP COLUMN IF EXISTS last_booking_at;

-- ============================================================================
-- PHASE 6: Drop Unused Enum Types
-- ============================================================================

-- Drop enums that are no longer used
DROP TYPE IF EXISTS cs_user_role CASCADE;
DROP TYPE IF EXISTS cs_booking_status CASCADE;
DROP TYPE IF EXISTS cs_referral_status CASCADE;
DROP TYPE IF EXISTS cs_moderation_status CASCADE;

-- Keep these enums (still in use):
-- cs_article_status (used by cs_articles)
-- cs_notification_type (used by cs_notifications)
-- cs_discount_type (used by cs_promo_codes)
-- cs_service_type (if cs_services was kept - but we dropped it)

-- ============================================================================
-- PHASE 6.5: Add Missing Columns (if they don't exist)
-- ============================================================================

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cs_coaches' AND column_name = 'is_active') THEN
        ALTER TABLE cs_coaches ADD COLUMN is_active boolean DEFAULT true;
        RAISE NOTICE 'Added is_active column to cs_coaches';
    END IF;
END $$;

-- Add onboarding_completed column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cs_coaches' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE cs_coaches ADD COLUMN onboarding_completed boolean DEFAULT false;
        RAISE NOTICE 'Added onboarding_completed column to cs_coaches';
    END IF;
END $$;

-- Add location_city column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cs_coaches' AND column_name = 'location_city') THEN
        ALTER TABLE cs_coaches ADD COLUMN location_city text;
        RAISE NOTICE 'Added location_city column to cs_coaches';
    END IF;
END $$;

-- Add location_country column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cs_coaches' AND column_name = 'location_country') THEN
        ALTER TABLE cs_coaches ADD COLUMN location_country text;
        RAISE NOTICE 'Added location_country column to cs_coaches';
    END IF;
END $$;

-- ============================================================================
-- PHASE 7: Add Missing Indexes for Performance
-- ============================================================================

-- Indexes on cs_coaches
CREATE INDEX IF NOT EXISTS idx_cs_coaches_is_active ON cs_coaches(is_active);
CREATE INDEX IF NOT EXISTS idx_cs_coaches_specialties ON cs_coaches USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_cs_coaches_languages ON cs_coaches USING GIN(languages);
CREATE INDEX IF NOT EXISTS idx_cs_coaches_location_country ON cs_coaches(location_country);
CREATE INDEX IF NOT EXISTS idx_cs_coaches_rating_average ON cs_coaches(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_cs_coaches_hourly_rate ON cs_coaches(hourly_rate);

-- Indexes on cs_reviews
CREATE INDEX IF NOT EXISTS idx_cs_reviews_coach_id ON cs_reviews(coach_id);
CREATE INDEX IF NOT EXISTS idx_cs_reviews_created_at ON cs_reviews(created_at DESC);

-- Indexes on cs_discovery_requests
CREATE INDEX IF NOT EXISTS idx_cs_discovery_requests_coach_id ON cs_discovery_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_cs_discovery_requests_status ON cs_discovery_requests(status);
CREATE INDEX IF NOT EXISTS idx_cs_discovery_requests_created_at ON cs_discovery_requests(created_at DESC);

-- Indexes on cs_articles
CREATE INDEX IF NOT EXISTS idx_cs_articles_coach_id ON cs_articles(coach_id);
CREATE INDEX IF NOT EXISTS idx_cs_articles_status ON cs_articles(status);
CREATE INDEX IF NOT EXISTS idx_cs_articles_published_at ON cs_articles(published_at DESC);

-- Indexes on cs_favorites
CREATE INDEX IF NOT EXISTS idx_cs_favorites_client_id ON cs_favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_cs_favorites_coach_id ON cs_favorites(coach_id);

-- Indexes on cs_notifications
CREATE INDEX IF NOT EXISTS idx_cs_notifications_user_id ON cs_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_notifications_is_read ON cs_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_cs_notifications_created_at ON cs_notifications(created_at DESC);

-- ============================================================================
-- PHASE 8: Update Comments/Documentation
-- ============================================================================

COMMENT ON TABLE cs_coaches IS 'Coach profiles - simplified schema as of 2024-12-16';
COMMENT ON COLUMN cs_coaches.session_types IS 'Array of session types: online, in-person, phone';
COMMENT ON COLUMN cs_coaches.location_city IS 'City where coach is based';
COMMENT ON COLUMN cs_coaches.location_country IS 'Country where coach is based';

COMMENT ON TABLE cs_users IS 'User accounts - simplified schema as of 2024-12-16';
COMMENT ON COLUMN cs_users.user_type IS 'User type: client, coach, or admin';

-- ============================================================================
-- PHASE 9: Create Helper View for Location Display
-- ============================================================================

CREATE OR REPLACE VIEW cs_coaches_with_location AS
SELECT
  *,
  COALESCE(
    NULLIF(CONCAT_WS(', ', location_city, location_country), ''),
    'Remote'
  ) AS location_display
FROM cs_coaches;

COMMENT ON VIEW cs_coaches_with_location IS 'Coach profiles with computed location_display field';

-- Recreate cs_active_coaches view with new schema (no location column)
CREATE OR REPLACE VIEW cs_active_coaches AS
SELECT
  c.*,
  COALESCE(
    NULLIF(CONCAT_WS(', ', c.location_city, c.location_country), ''),
    'Remote'
  ) AS location_display
FROM cs_coaches c
WHERE c.is_active = true
  AND c.onboarding_completed = true;

COMMENT ON VIEW cs_active_coaches IS 'Active coaches who completed onboarding, with computed location';

-- ============================================================================
-- PHASE 10: Verify Migration
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
  coach_count INTEGER;
BEGIN
  -- Count remaining cs_ tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'cs_%'
    AND table_type = 'BASE TABLE';

  -- Count coaches
  SELECT COUNT(*) INTO coach_count FROM cs_coaches;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Remaining cs_ tables: %', table_count;
  RAISE NOTICE 'Total coaches: %', coach_count;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION: Tables Remaining (should be ~14-15)
-- ============================================================================
-- cs_users
-- cs_coaches
-- cs_clients
-- cs_bookings (kept for future use)
-- cs_reviews
-- cs_discovery_requests
-- cs_favorites
-- cs_articles
-- cs_notifications
-- cs_promo_codes
-- cs_promo_code_usage
-- cs_referral_codes
-- cs_referral_code_usage
-- cs_feature_flags
-- cs_coach_views
-- ============================================================================
