-- Migration: Create Coach Certifications Table
-- Date: 2024-12-21
-- Description: Creates a table to store coach certifications with support for
--              PDF uploads or URL links to certificates

-- ============================================================================
-- 1. CREATE COACH CERTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cs_coach_certifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    coach_id uuid NOT NULL,
    name text NOT NULL,
    date_acquired date,
    certificate_url text,
    certificate_file_path text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_coach_certifications_pkey PRIMARY KEY (id),
    CONSTRAINT cs_coach_certifications_coach_id_fkey FOREIGN KEY (coach_id)
        REFERENCES public.cs_coaches(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cs_coach_certifications_coach_id
    ON public.cs_coach_certifications(coach_id);

CREATE INDEX IF NOT EXISTS idx_cs_coach_certifications_created_at
    ON public.cs_coach_certifications(created_at DESC);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.cs_coach_certifications ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own certifications
CREATE POLICY "Coaches can view own certifications" ON public.cs_coach_certifications
    FOR SELECT USING (
        coach_id IN (SELECT id FROM public.cs_coaches WHERE user_id = auth.uid())
    );

-- Anyone can view certifications (for public coach profiles)
CREATE POLICY "Anyone can view certifications" ON public.cs_coach_certifications
    FOR SELECT USING (true);

-- Coaches can insert their own certifications
CREATE POLICY "Coaches can insert own certifications" ON public.cs_coach_certifications
    FOR INSERT WITH CHECK (
        coach_id IN (SELECT id FROM public.cs_coaches WHERE user_id = auth.uid())
    );

-- Coaches can update their own certifications
CREATE POLICY "Coaches can update own certifications" ON public.cs_coach_certifications
    FOR UPDATE USING (
        coach_id IN (SELECT id FROM public.cs_coaches WHERE user_id = auth.uid())
    );

-- Coaches can delete their own certifications
CREATE POLICY "Coaches can delete own certifications" ON public.cs_coach_certifications
    FOR DELETE USING (
        coach_id IN (SELECT id FROM public.cs_coaches WHERE user_id = auth.uid())
    );

-- ============================================================================
-- 4. CREATE STORAGE BUCKET FOR CERTIFICATES (if not exists)
-- ============================================================================

-- Note: This needs to be run via Supabase dashboard or API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('certificates', 'certificates', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.cs_coach_certifications IS 'Stores coach certifications and credentials';
COMMENT ON COLUMN public.cs_coach_certifications.coach_id IS 'Reference to the coach who owns this certification';
COMMENT ON COLUMN public.cs_coach_certifications.name IS 'Name of the certification (e.g., ICF ACC, PCC, MCC)';
COMMENT ON COLUMN public.cs_coach_certifications.date_acquired IS 'Date when the certification was acquired';
COMMENT ON COLUMN public.cs_coach_certifications.certificate_url IS 'External URL to verify the certificate';
COMMENT ON COLUMN public.cs_coach_certifications.certificate_file_path IS 'Storage path for uploaded PDF certificate';
COMMENT ON COLUMN public.cs_coach_certifications.is_verified IS 'Whether the certification has been verified by admin';
