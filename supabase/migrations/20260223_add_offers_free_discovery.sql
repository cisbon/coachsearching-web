-- ============================================================================
-- Migration: Add offers_free_discovery column to cs_coaches
-- Date: 2026-02-23
-- Description: Adds the offers_free_discovery boolean flag so coaches can
--              indicate whether they offer a free discovery/intro call.
--              This column is collected during onboarding and displayed on
--              coach profiles and in search filters.
-- ============================================================================

ALTER TABLE public.cs_coaches
ADD COLUMN IF NOT EXISTS offers_free_discovery BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.cs_coaches.offers_free_discovery IS
    'Whether the coach offers a free discovery/intro call to prospective clients';

CREATE INDEX IF NOT EXISTS idx_cs_coaches_offers_free_discovery
    ON public.cs_coaches(offers_free_discovery);
