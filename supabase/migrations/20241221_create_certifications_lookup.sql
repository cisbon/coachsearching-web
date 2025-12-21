-- Migration: Create Certifications Lookup Table
-- Date: 2024-12-21
-- Description: Creates a lookup table for all recognized coaching certifications
--              with badge URLs for display on coach profiles

-- ============================================================================
-- 1. CREATE CERTIFICATIONS LOOKUP TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cs_certifications (
    id SERIAL PRIMARY KEY,
    code text NOT NULL UNIQUE,              -- Unique code (e.g., 'ICF_ACC')
    name text NOT NULL,                      -- Display name (e.g., 'ICF ACC (Associate Certified Coach)')
    short_name text,                         -- Short name for badges (e.g., 'ICF ACC')
    issuing_organization text NOT NULL,      -- Organization code (e.g., 'ICF')
    organization_full_name text,             -- Full org name (e.g., 'International Coaching Federation')
    badge_url text,                          -- URL to certification badge image
    website_url text,                        -- Official website for verification
    level integer DEFAULT 1,                 -- Level within organization (1=entry, 2=mid, 3=advanced, 4=master)
    category text DEFAULT 'general',         -- Category: general, executive, health, nlp, etc.
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cs_certifications_code ON public.cs_certifications(code);
CREATE INDEX IF NOT EXISTS idx_cs_certifications_org ON public.cs_certifications(issuing_organization);
CREATE INDEX IF NOT EXISTS idx_cs_certifications_category ON public.cs_certifications(category);
CREATE INDEX IF NOT EXISTS idx_cs_certifications_active ON public.cs_certifications(is_active);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.cs_certifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read certifications (public lookup table)
CREATE POLICY "Anyone can view certifications lookup" ON public.cs_certifications
    FOR SELECT USING (is_active = true);

-- Admin full access
CREATE POLICY "Admin full access to certifications" ON public.cs_certifications
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM cs_users WHERE user_type = 'admin')
    );

-- ============================================================================
-- 4. INSERT ALL CERTIFICATIONS DATA
-- ============================================================================

INSERT INTO public.cs_certifications (code, name, short_name, issuing_organization, organization_full_name, badge_url, website_url, level, category, sort_order)
VALUES
-- ICF - International Coaching Federation
('ICF_ACC', 'ICF ACC (Associate Certified Coach)', 'ICF ACC', 'ICF', 'International Coaching Federation', 'https://coachingfederation.org/credentials/acc-badge.png', 'https://coachingfederation.org/credentials/acc', 1, 'general', 1),
('ICF_PCC', 'ICF PCC (Professional Certified Coach)', 'ICF PCC', 'ICF', 'International Coaching Federation', 'https://coachingfederation.org/credentials/pcc-badge.png', 'https://coachingfederation.org/credentials/pcc', 2, 'general', 2),
('ICF_MCC', 'ICF MCC (Master Certified Coach)', 'ICF MCC', 'ICF', 'International Coaching Federation', 'https://coachingfederation.org/credentials/mcc-badge.png', 'https://coachingfederation.org/credentials/mcc', 3, 'general', 3),
('ICF_ACTC', 'ICF ACTC (Advanced Certification in Team Coaching)', 'ICF ACTC', 'ICF', 'International Coaching Federation', 'https://coachingfederation.org/credentials/actc-badge.png', 'https://coachingfederation.org/credentials/actc', 3, 'team', 4),

-- EMCC - European Mentoring and Coaching Council
('EMCC_EIA_FOUNDATION', 'EMCC EIA Foundation', 'EMCC Foundation', 'EMCC', 'European Mentoring and Coaching Council', NULL, 'https://emccglobal.org/accreditation/eia/', 1, 'general', 10),
('EMCC_EIA_PRACTITIONER', 'EMCC EIA Practitioner', 'EMCC Practitioner', 'EMCC', 'European Mentoring and Coaching Council', NULL, 'https://emccglobal.org/accreditation/eia/', 2, 'general', 11),
('EMCC_EIA_SENIOR', 'EMCC EIA Senior Practitioner', 'EMCC Senior', 'EMCC', 'European Mentoring and Coaching Council', NULL, 'https://emccglobal.org/accreditation/eia/', 3, 'general', 12),
('EMCC_EIA_MASTER', 'EMCC EIA Master Practitioner', 'EMCC Master', 'EMCC', 'European Mentoring and Coaching Council', NULL, 'https://emccglobal.org/accreditation/eia/', 4, 'general', 13),
('EMCC_ESIA', 'EMCC ESIA (Supervisor)', 'EMCC Supervisor', 'EMCC', 'European Mentoring and Coaching Council', NULL, 'https://emccglobal.org/accreditation/esia/', 4, 'supervision', 14),

-- AC - Association for Coaching
('AC_FOUNDATION', 'AC Foundation Coach', 'AC Foundation', 'AC', 'Association for Coaching', NULL, 'https://www.associationforcoaching.com/page/ACAccreditation', 1, 'general', 20),
('AC_COACH', 'AC Coach', 'AC Coach', 'AC', 'Association for Coaching', NULL, 'https://www.associationforcoaching.com/page/ACAccreditation', 2, 'general', 21),
('AC_PROFESSIONAL', 'AC Professional Coach', 'AC Professional', 'AC', 'Association for Coaching', NULL, 'https://www.associationforcoaching.com/page/ACAccreditation', 3, 'general', 22),
('AC_MASTER', 'AC Master Coach', 'AC Master', 'AC', 'Association for Coaching', NULL, 'https://www.associationforcoaching.com/page/ACAccreditation', 4, 'general', 23),
('AC_EXEC_FOUNDATION', 'AC Foundation Executive Coach', 'AC Exec Foundation', 'AC', 'Association for Coaching', NULL, 'https://www.associationforcoaching.com/page/ACAccreditation', 1, 'executive', 24),
('AC_EXEC', 'AC Executive Coach', 'AC Executive', 'AC', 'Association for Coaching', NULL, 'https://www.associationforcoaching.com/page/ACAccreditation', 2, 'executive', 25),
('AC_EXEC_PROFESSIONAL', 'AC Professional Executive Coach', 'AC Exec Professional', 'AC', 'Association for Coaching', NULL, 'https://www.associationforcoaching.com/page/ACAccreditation', 3, 'executive', 26),
('AC_EXEC_MASTER', 'AC Master Executive Coach', 'AC Exec Master', 'AC', 'Association for Coaching', NULL, 'https://www.associationforcoaching.com/page/ACAccreditation', 4, 'executive', 27),

-- Health & Wellness Certifications
('NBC_HWC', 'NBC-HWC (National Board Certified Health & Wellness Coach)', 'NBC-HWC', 'NBHWC', 'National Board for Health & Wellness Coaching', NULL, 'https://nbhwc.org/', 2, 'health', 30),
('BCC', 'BCC (Board Certified Coach)', 'BCC', 'CCE', 'Center for Credentialing & Education', NULL, 'https://www.cce-global.org/bcc', 2, 'general', 31),

-- APECS - Association for Professional Executive Coaching and Supervision
('APECS_ASSOCIATE', 'APECS Associate', 'APECS Associate', 'APECS', 'Association for Professional Executive Coaching and Supervision', NULL, 'https://www.apecs.org/', 1, 'executive', 40),
('APECS_CERTIFIED', 'APECS Certified Professional', 'APECS Certified', 'APECS', 'Association for Professional Executive Coaching and Supervision', NULL, 'https://www.apecs.org/', 2, 'executive', 41),
('APECS_MASTER', 'APECS Master', 'APECS Master', 'APECS', 'Association for Professional Executive Coaching and Supervision', NULL, 'https://www.apecs.org/', 3, 'executive', 42),

-- WABC - Worldwide Association of Business Coaches
('WABC_RCC', 'WABC RCC (Registered Corporate Coach)', 'WABC RCC', 'WABC', 'Worldwide Association of Business Coaches', NULL, 'https://www.wabccoaches.com/', 1, 'business', 50),
('WABC_CBC', 'WABC CBC (Certified Business Coach)', 'WABC CBC', 'WABC', 'Worldwide Association of Business Coaches', NULL, 'https://www.wabccoaches.com/', 2, 'business', 51),
('WABC_CMBC', 'WABC CMBC (Certified Master Business Coach)', 'WABC CMBC', 'WABC', 'Worldwide Association of Business Coaches', NULL, 'https://www.wabccoaches.com/', 3, 'business', 52),
('WABC_CHBC', 'WABC ChBC (Chartered Business Coach)', 'WABC ChBC', 'WABC', 'Worldwide Association of Business Coaches', NULL, 'https://www.wabccoaches.com/', 4, 'business', 53),

-- ECA - European Coaching Association
('ECA_BASIC', 'ECA Basic License', 'ECA Basic', 'ECA', 'European Coaching Association', NULL, 'https://www.european-coaching-association.de/', 1, 'general', 60),
('ECA_ADVANCED', 'ECA Advanced License', 'ECA Advanced', 'ECA', 'European Coaching Association', NULL, 'https://www.european-coaching-association.de/', 2, 'general', 61),
('ECA_EXPERT', 'ECA Expert License', 'ECA Expert', 'ECA', 'European Coaching Association', NULL, 'https://www.european-coaching-association.de/', 3, 'general', 62),

-- EASC - European Association for Supervision and Coaching
('EASC_CERTIFIED', 'EASC Certified', 'EASC', 'EASC', 'European Association for Supervision and Coaching', NULL, 'https://www.easc-online.eu/', 2, 'supervision', 70),

-- ILM - Institute of Leadership & Management
('ILM_LEVEL_5', 'ILM Level 5', 'ILM L5', 'ILM', 'Institute of Leadership & Management', NULL, 'https://www.i-l-m.com/', 2, 'leadership', 80),
('ILM_LEVEL_7', 'ILM Level 7', 'ILM L7', 'ILM', 'Institute of Leadership & Management', NULL, 'https://www.i-l-m.com/', 3, 'leadership', 81),

-- CMI - Chartered Management Institute
('CMI_LEVEL_5', 'CMI Level 5', 'CMI L5', 'CMI', 'Chartered Management Institute', NULL, 'https://www.managers.org.uk/', 2, 'leadership', 90),
('CMI_LEVEL_7', 'CMI Level 7', 'CMI L7', 'CMI', 'Chartered Management Institute', NULL, 'https://www.managers.org.uk/', 3, 'leadership', 91),

-- NLP
('NLP_PRACTITIONER', 'NLP Practitioner', 'NLP Practitioner', 'NLP', 'Neuro-Linguistic Programming', NULL, NULL, 1, 'nlp', 100),
('NLP_MASTER', 'NLP Master Practitioner', 'NLP Master', 'NLP', 'Neuro-Linguistic Programming', NULL, NULL, 2, 'nlp', 101)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    issuing_organization = EXCLUDED.issuing_organization,
    organization_full_name = EXCLUDED.organization_full_name,
    badge_url = EXCLUDED.badge_url,
    website_url = EXCLUDED.website_url,
    level = EXCLUDED.level,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- ============================================================================
-- 5. ADD FOREIGN KEY TO COACH CERTIFICATIONS (if table exists)
-- ============================================================================

-- Add foreign key reference (optional - allows referential integrity)
-- Note: Run this only if cs_coach_certifications table already exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cs_coach_certifications') THEN
        -- Check if constraint already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'cs_coach_certifications_cert_code_fkey'
        ) THEN
            ALTER TABLE public.cs_coach_certifications
            ADD CONSTRAINT cs_coach_certifications_cert_code_fkey
            FOREIGN KEY (certification_code) REFERENCES public.cs_certifications(code);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 6. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_cs_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cs_certifications_updated_at ON public.cs_certifications;
CREATE TRIGGER trigger_cs_certifications_updated_at
    BEFORE UPDATE ON public.cs_certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_cs_certifications_updated_at();

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.cs_certifications IS 'Lookup table for all recognized coaching certifications with badge URLs';
COMMENT ON COLUMN public.cs_certifications.code IS 'Unique certification code (e.g., ICF_ACC, EMCC_EIA_MASTER)';
COMMENT ON COLUMN public.cs_certifications.name IS 'Full display name of the certification';
COMMENT ON COLUMN public.cs_certifications.short_name IS 'Short name for badges and compact display';
COMMENT ON COLUMN public.cs_certifications.issuing_organization IS 'Organization code (e.g., ICF, EMCC, AC)';
COMMENT ON COLUMN public.cs_certifications.organization_full_name IS 'Full name of the issuing organization';
COMMENT ON COLUMN public.cs_certifications.badge_url IS 'URL to the official certification badge image';
COMMENT ON COLUMN public.cs_certifications.website_url IS 'Official website URL for verification';
COMMENT ON COLUMN public.cs_certifications.level IS 'Level within organization hierarchy (1=entry, 2=mid, 3=advanced, 4=master)';
COMMENT ON COLUMN public.cs_certifications.category IS 'Category: general, executive, health, business, leadership, nlp, team, supervision';

-- ============================================================================
-- 8. VERIFY DATA
-- ============================================================================

SELECT
    issuing_organization as org,
    COUNT(*) as cert_count,
    array_agg(short_name ORDER BY level) as certifications
FROM public.cs_certifications
GROUP BY issuing_organization
ORDER BY MIN(sort_order);
