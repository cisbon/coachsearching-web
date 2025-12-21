-- Migration: Create Coach Certifications Table
-- Date: 2024-12-21
-- Description: Creates a table to store coach certifications with support for
--              PDF uploads or URL links to certificates
-- NOTE: Run the cs_certifications lookup table migration FIRST!

-- ============================================================================
-- 1. CREATE COACH CERTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cs_coach_certifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    coach_id uuid NOT NULL,
    certification_id integer NOT NULL,     -- Foreign key to cs_certifications.id
    date_acquired date,
    certificate_url text,                   -- External URL to verify the certificate
    certificate_file_path text,             -- Storage path for uploaded PDF
    is_verified boolean DEFAULT false,      -- Admin verification status
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_coach_certifications_pkey PRIMARY KEY (id),
    CONSTRAINT cs_coach_certifications_coach_id_fkey FOREIGN KEY (coach_id)
        REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    CONSTRAINT cs_coach_certifications_cert_id_fkey FOREIGN KEY (certification_id)
        REFERENCES public.cs_certifications(id) ON DELETE RESTRICT,
    CONSTRAINT cs_coach_certifications_unique_cert UNIQUE (coach_id, certification_id)
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cs_coach_certifications_coach_id
    ON public.cs_coach_certifications(coach_id);

CREATE INDEX IF NOT EXISTS idx_cs_coach_certifications_cert_id
    ON public.cs_coach_certifications(certification_id);

CREATE INDEX IF NOT EXISTS idx_cs_coach_certifications_verified
    ON public.cs_coach_certifications(is_verified);

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
-- 4. CREATE STORAGE BUCKET FOR CERTIFICATES
-- ============================================================================

-- Create the storage bucket for coach certificates (PDFs only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'coach-certifications',
    'coach-certifications',
    true,  -- Public so certificates can be viewed on profiles
    10485760,  -- 10MB max file size
    ARRAY['application/pdf']::text[]  -- Only PDF files allowed
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 5. STORAGE BUCKET RLS POLICIES
-- ============================================================================

-- Policy: Anyone can view/download certificates (public bucket)
CREATE POLICY "Anyone can view certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'coach-certifications');

-- Policy: Authenticated coaches can upload their own certificates
-- File path must be in format: {user_id}/cert_{timestamp}.pdf
CREATE POLICY "Coaches can upload own certificates"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'coach-certifications'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Coaches can update their own certificates
CREATE POLICY "Coaches can update own certificates"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'coach-certifications'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Coaches can delete their own certificates
CREATE POLICY "Coaches can delete own certificates"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'coach-certifications'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 6. CREATE VIEW FOR EASY QUERYING (joins with lookup table)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_coach_certifications AS
SELECT
    cc.id,
    cc.coach_id,
    cc.certification_id,
    c.code as certification_code,
    c.name as certification_name,
    c.short_name,
    c.issuing_organization,
    c.organization_full_name,
    c.badge_url,
    c.website_url,
    c.level,
    c.category,
    cc.date_acquired,
    cc.certificate_url,
    cc.certificate_file_path,
    cc.is_verified,
    cc.created_at,
    cc.updated_at
FROM public.cs_coach_certifications cc
JOIN public.cs_certifications c ON cc.certification_id = c.id;

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.cs_coach_certifications IS 'Links coaches to their certifications from the cs_certifications lookup table';
COMMENT ON COLUMN public.cs_coach_certifications.coach_id IS 'Reference to the coach who holds this certification';
COMMENT ON COLUMN public.cs_coach_certifications.certification_id IS 'Reference to cs_certifications lookup table';
COMMENT ON COLUMN public.cs_coach_certifications.date_acquired IS 'Date when the certification was acquired';
COMMENT ON COLUMN public.cs_coach_certifications.certificate_url IS 'External URL to verify the certificate';
COMMENT ON COLUMN public.cs_coach_certifications.certificate_file_path IS 'Storage path for uploaded PDF certificate';
COMMENT ON COLUMN public.cs_coach_certifications.is_verified IS 'Whether the certification has been verified by admin';
COMMENT ON VIEW public.v_coach_certifications IS 'View joining coach certifications with certification details for easy querying';
