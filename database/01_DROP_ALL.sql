-- =====================================================
-- STEP 1: DROP ALL EXISTING TABLES
-- This will clean your Supabase database completely
-- Run this FIRST, then run 02_CREATE_SCHEMA.sql
-- =====================================================

-- Drop all cs_ prefixed tables (NEW)
DROP TABLE IF EXISTS public.cs_promo_code_usage CASCADE;
DROP TABLE IF EXISTS public.cs_promo_codes CASCADE;
DROP TABLE IF EXISTS public.cs_refunds CASCADE;
DROP TABLE IF EXISTS public.cs_payouts CASCADE;
DROP TABLE IF EXISTS public.cs_invoices CASCADE;
DROP TABLE IF EXISTS public.cs_search_history CASCADE;
DROP TABLE IF EXISTS public.cs_coach_views CASCADE;
DROP TABLE IF EXISTS public.cs_favorites CASCADE;
DROP TABLE IF EXISTS public.cs_notifications CASCADE;
DROP TABLE IF EXISTS public.cs_messages CASCADE;
DROP TABLE IF EXISTS public.cs_conversations CASCADE;
DROP TABLE IF EXISTS public.cs_pro_bono_bookings CASCADE;
DROP TABLE IF EXISTS public.cs_pro_bono_slots CASCADE;
DROP TABLE IF EXISTS public.cs_articles CASCADE;
DROP TABLE IF EXISTS public.cs_reviews CASCADE;
DROP TABLE IF EXISTS public.cs_bookings CASCADE;
DROP TABLE IF EXISTS public.cs_services CASCADE;
DROP TABLE IF EXISTS public.cs_coach_availability_overrides CASCADE;
DROP TABLE IF EXISTS public.cs_coach_availability CASCADE;
DROP TABLE IF EXISTS public.cs_coaches CASCADE;
DROP TABLE IF EXISTS public.cs_users CASCADE;
DROP TABLE IF EXISTS public.cs_reports CASCADE;
DROP TABLE IF EXISTS public.cs_account_deletion_requests CASCADE;
DROP TABLE IF EXISTS public.cs_data_export_requests CASCADE;
DROP TABLE IF EXISTS public.cs_agreements CASCADE;
DROP TABLE IF EXISTS public.cs_terms_acceptance CASCADE;
DROP TABLE IF EXISTS public.cs_email_captures CASCADE;
DROP TABLE IF EXISTS public.cs_referrals CASCADE;
DROP TABLE IF EXISTS public.cs_feature_flags CASCADE;
DROP TABLE IF EXISTS public.cs_audit_log CASCADE;

-- Drop old tables without cs_ prefix (if any exist)
DROP TABLE IF EXISTS public.referral_codes CASCADE;
DROP TABLE IF EXISTS public.promo_code_usage CASCADE;
DROP TABLE IF EXISTS public.promo_codes CASCADE;
DROP TABLE IF EXISTS public.refunds CASCADE;
DROP TABLE IF EXISTS public.payouts CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.coach_views CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.search_history CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.pro_bono_bookings CASCADE;
DROP TABLE IF EXISTS public.pro_bono_slots CASCADE;
DROP TABLE IF EXISTS public.articles CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.coach_availability_overrides CASCADE;
DROP TABLE IF EXISTS public.coach_availability CASCADE;
DROP TABLE IF EXISTS public.coaches CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.account_deletion_requests CASCADE;
DROP TABLE IF EXISTS public.data_export_requests CASCADE;
DROP TABLE IF EXISTS public.agreements CASCADE;
DROP TABLE IF EXISTS public.terms_acceptance CASCADE;
DROP TABLE IF EXISTS public.email_captures CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;

-- Drop views
DROP VIEW IF EXISTS cs_coach_search_view CASCADE;
DROP VIEW IF EXISTS cs_upcoming_bookings_view CASCADE;
DROP VIEW IF EXISTS coach_search_view CASCADE;
DROP VIEW IF EXISTS upcoming_bookings_view CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_coach_review_stats() CASCADE;
DROP FUNCTION IF EXISTS public.update_conversation_last_message() CASCADE;
DROP FUNCTION IF EXISTS public.mark_pro_bono_slot_booked() CASCADE;
DROP FUNCTION IF EXISTS public.generate_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS public.create_referral_code_for_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS cs_invoice_number_seq CASCADE;
DROP SEQUENCE IF EXISTS invoice_number_seq CASCADE;

-- Drop enums (cs_ prefixed)
DROP TYPE IF EXISTS cs_user_role CASCADE;
DROP TYPE IF EXISTS cs_booking_status CASCADE;
DROP TYPE IF EXISTS cs_meeting_type CASCADE;
DROP TYPE IF EXISTS cs_service_type CASCADE;
DROP TYPE IF EXISTS cs_article_status CASCADE;
DROP TYPE IF EXISTS cs_moderation_status CASCADE;
DROP TYPE IF EXISTS cs_notification_type CASCADE;
DROP TYPE IF EXISTS cs_discount_type CASCADE;
DROP TYPE IF EXISTS cs_referral_status CASCADE;

-- Drop old enums (if any)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS meeting_type CASCADE;
DROP TYPE IF EXISTS service_type CASCADE;
DROP TYPE IF EXISTS article_status CASCADE;
DROP TYPE IF EXISTS moderation_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS discount_type CASCADE;
DROP TYPE IF EXISTS referral_status CASCADE;

-- =====================================================
-- ALL TABLES DROPPED
-- =====================================================
-- Your database is now clean.
--
-- Next steps:
-- 1. Run 02_CREATE_SCHEMA.sql to create all tables
-- 2. Run 03_INDEXES_AND_POLICIES.sql for indexes & RLS
-- =====================================================
