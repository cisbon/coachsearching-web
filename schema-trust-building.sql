-- Trust-Building Coach Profile System Schema Extension
-- Run this after the main schema.sql

-- =============================================
-- 1. EXTEND CS_COACHES TABLE
-- =============================================

-- Add trust-building columns to cs_coaches
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS video_intro_url TEXT;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS response_time_hours INTEGER DEFAULT 24;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS address TEXT; -- For onsite sessions
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS promo_code_used TEXT;
ALTER TABLE public.cs_coaches ADD COLUMN IF NOT EXISTS subscription_discount INTEGER DEFAULT 0;

-- =============================================
-- 2. COACH CREDENTIALS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.cs_coach_credentials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL CHECK (credential_type IN ('certification', 'degree', 'accreditation', 'training', 'award')),
    title TEXT NOT NULL,
    issuing_organization TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    credential_url TEXT, -- Link to verify credential
    document_url TEXT, -- Uploaded proof document
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by TEXT, -- Admin who verified
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. COACH SERVICES / PRICING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.cs_coach_services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('single_session', 'package', 'subscription', 'discovery_call')),
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    session_count INTEGER DEFAULT 1, -- For packages
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. PLATFORM STATISTICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.cs_platform_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_coaches INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    total_hours_coached DECIMAL(10, 2) DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    countries_served INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Initialize platform stats
INSERT INTO public.cs_platform_stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 5. PROMO CODES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.cs_promo_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_trial')),
    discount_value DECIMAL(10, 2), -- Percentage or fixed amount
    free_trial_days INTEGER, -- For free_trial type
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default promo codes
INSERT INTO cs_promo_codes (code, description, discount_type, discount_value, free_trial_days, max_uses) VALUES
('WELCOME30', 'Welcome discount - 30% off first 3 months', 'percentage', 30, NULL, 1000),
('COACH2024', 'Coach launch offer - 50% off first month', 'percentage', 50, NULL, 500),
('FREETRIAL', '30-day free trial for new coaches', 'free_trial', NULL, 30, 1000),
('BETA60', 'Beta tester - 60 days free', 'free_trial', NULL, 60, 100)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 6. SESSION NOTES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.cs_session_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.cs_bookings(id) ON DELETE SET NULL,
    note_type TEXT DEFAULT 'session' CHECK (note_type IN ('session', 'general', 'goal', 'progress')),
    title TEXT,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT TRUE, -- Coach-only or shared with client
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. REFERRALS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.cs_referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_email TEXT NOT NULL,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referral_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'converted', 'rewarded')),
    reward_type TEXT, -- 'credit', 'discount', 'cash'
    reward_amount DECIMAL(10, 2),
    reward_currency TEXT DEFAULT 'EUR',
    converted_at TIMESTAMP WITH TIME ZONE,
    rewarded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 8. TRUST SCORE CALCULATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_trust_score(coach_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    coach_record RECORD;
    credential_count INTEGER;
    verified_credential_count INTEGER;
    review_count INTEGER;
    avg_rating DECIMAL;
    completed_sessions INTEGER;
BEGIN
    -- Get coach data
    SELECT * INTO coach_record FROM cs_coaches WHERE id = coach_uuid;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- 1. Video Introduction (30 points)
    IF coach_record.video_intro_url IS NOT NULL AND coach_record.video_intro_url != '' THEN
        score := score + 30;
    END IF;

    -- 2. Verified Credentials (up to 20 points)
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_verified = TRUE)
    INTO credential_count, verified_credential_count
    FROM cs_coach_credentials WHERE coach_id = coach_uuid;

    -- 5 points per verified credential, max 20
    score := score + LEAST(verified_credential_count * 5, 20);

    -- 3. Profile Completeness (up to 15 points)
    -- Check various profile fields
    IF coach_record.bio IS NOT NULL AND LENGTH(coach_record.bio) > 100 THEN
        score := score + 3;
    END IF;
    IF coach_record.avatar_url IS NOT NULL THEN
        score := score + 3;
    END IF;
    IF coach_record.specialties IS NOT NULL AND array_length(coach_record.specialties, 1) > 0 THEN
        score := score + 3;
    END IF;
    IF coach_record.languages IS NOT NULL AND array_length(coach_record.languages, 1) > 0 THEN
        score := score + 3;
    END IF;
    IF coach_record.years_experience > 0 THEN
        score := score + 3;
    END IF;

    -- 4. Client Reviews (up to 20 points)
    SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO review_count, avg_rating
    FROM cs_reviews WHERE coach_id = coach_uuid;

    -- Points based on rating (max 10)
    IF avg_rating >= 4.5 THEN
        score := score + 10;
    ELSIF avg_rating >= 4.0 THEN
        score := score + 7;
    ELSIF avg_rating >= 3.5 THEN
        score := score + 5;
    ELSIF avg_rating >= 3.0 THEN
        score := score + 3;
    END IF;

    -- Points based on review count (max 10)
    IF review_count >= 50 THEN
        score := score + 10;
    ELSIF review_count >= 20 THEN
        score := score + 7;
    ELSIF review_count >= 10 THEN
        score := score + 5;
    ELSIF review_count >= 5 THEN
        score := score + 3;
    ELSIF review_count >= 1 THEN
        score := score + 1;
    END IF;

    -- 5. Session History (up to 10 points)
    SELECT COUNT(*) INTO completed_sessions
    FROM cs_bookings
    WHERE coach_id = coach_uuid AND status = 'completed';

    IF completed_sessions >= 100 THEN
        score := score + 10;
    ELSIF completed_sessions >= 50 THEN
        score := score + 7;
    ELSIF completed_sessions >= 20 THEN
        score := score + 5;
    ELSIF completed_sessions >= 10 THEN
        score := score + 3;
    ELSIF completed_sessions >= 1 THEN
        score := score + 1;
    END IF;

    -- 6. Verified Account (5 points)
    IF coach_record.is_verified = TRUE THEN
        score := score + 5;
    END IF;

    RETURN LEAST(score, 100); -- Cap at 100
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 9. PROFILE COMPLETION CALCULATION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_profile_completion(coach_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    completion INTEGER := 0;
    total_fields INTEGER := 10;
    filled_fields INTEGER := 0;
    coach_record RECORD;
BEGIN
    SELECT * INTO coach_record FROM cs_coaches WHERE id = coach_uuid;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Check each field
    IF coach_record.full_name IS NOT NULL AND coach_record.full_name != '' THEN
        filled_fields := filled_fields + 1;
    END IF;
    IF coach_record.avatar_url IS NOT NULL AND coach_record.avatar_url != '' THEN
        filled_fields := filled_fields + 1;
    END IF;
    IF coach_record.title IS NOT NULL AND coach_record.title != '' THEN
        filled_fields := filled_fields + 1;
    END IF;
    IF coach_record.bio IS NOT NULL AND LENGTH(coach_record.bio) > 50 THEN
        filled_fields := filled_fields + 1;
    END IF;
    IF coach_record.specialties IS NOT NULL AND array_length(coach_record.specialties, 1) > 0 THEN
        filled_fields := filled_fields + 1;
    END IF;
    IF coach_record.languages IS NOT NULL AND array_length(coach_record.languages, 1) > 0 THEN
        filled_fields := filled_fields + 1;
    END IF;
    IF coach_record.hourly_rate IS NOT NULL AND coach_record.hourly_rate > 0 THEN
        filled_fields := filled_fields + 1;
    END IF;
    IF coach_record.video_intro_url IS NOT NULL AND coach_record.video_intro_url != '' THEN
        filled_fields := filled_fields + 1;
    END IF;
    IF coach_record.session_types IS NOT NULL AND array_length(coach_record.session_types, 1) > 0 THEN
        filled_fields := filled_fields + 1;
    END IF;
    IF coach_record.years_experience > 0 THEN
        filled_fields := filled_fields + 1;
    END IF;

    RETURN (filled_fields * 100) / total_fields;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. AUTO-UPDATE TRIGGERS
-- =============================================

-- Update trust score when coach profile changes
CREATE OR REPLACE FUNCTION update_coach_trust_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.trust_score := calculate_trust_score(NEW.id);
    NEW.profile_completion := calculate_profile_completion(NEW.id);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_coach_trust_score_trigger ON cs_coaches;
CREATE TRIGGER update_coach_trust_score_trigger
BEFORE UPDATE ON cs_coaches
FOR EACH ROW
EXECUTE FUNCTION update_coach_trust_score();

-- Update trust score when credentials change
CREATE OR REPLACE FUNCTION update_coach_trust_on_credential_change()
RETURNS TRIGGER AS $$
DECLARE
    affected_coach_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_coach_id := OLD.coach_id;
    ELSE
        affected_coach_id := NEW.coach_id;
    END IF;

    UPDATE cs_coaches
    SET trust_score = calculate_trust_score(affected_coach_id),
        updated_at = NOW()
    WHERE id = affected_coach_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trust_on_credential_trigger ON cs_coach_credentials;
CREATE TRIGGER update_trust_on_credential_trigger
AFTER INSERT OR UPDATE OR DELETE ON cs_coach_credentials
FOR EACH ROW
EXECUTE FUNCTION update_coach_trust_on_credential_change();

-- Update trust score when reviews change
CREATE OR REPLACE FUNCTION update_coach_trust_on_review_change()
RETURNS TRIGGER AS $$
DECLARE
    affected_coach_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_coach_id := OLD.coach_id;
    ELSE
        affected_coach_id := NEW.coach_id;
    END IF;

    UPDATE cs_coaches
    SET trust_score = calculate_trust_score(affected_coach_id),
        updated_at = NOW()
    WHERE id = affected_coach_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trust_on_review_trigger ON cs_reviews;
CREATE TRIGGER update_trust_on_review_trigger
AFTER INSERT OR UPDATE OR DELETE ON cs_reviews
FOR EACH ROW
EXECUTE FUNCTION update_coach_trust_on_review_change();

-- Update platform stats periodically
CREATE OR REPLACE FUNCTION update_platform_stats()
RETURNS VOID AS $$
BEGIN
    UPDATE cs_platform_stats SET
        total_coaches = (SELECT COUNT(*) FROM cs_coaches WHERE onboarding_completed = TRUE),
        total_sessions = (SELECT COUNT(*) FROM cs_bookings WHERE status = 'completed'),
        total_hours_coached = (SELECT COALESCE(SUM(duration_minutes), 0) / 60.0 FROM cs_bookings WHERE status = 'completed'),
        average_rating = (SELECT COALESCE(AVG(rating), 0) FROM cs_reviews),
        total_reviews = (SELECT COUNT(*) FROM cs_reviews),
        countries_served = (SELECT COUNT(DISTINCT country) FROM cs_coaches WHERE country IS NOT NULL),
        updated_at = NOW()
    WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 11. RLS POLICIES FOR NEW TABLES
-- =============================================

ALTER TABLE public.cs_coach_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coach_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_platform_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_referrals ENABLE ROW LEVEL SECURITY;

-- Credentials: Public read, coach manage
CREATE POLICY "Credentials are viewable by everyone" ON public.cs_coach_credentials FOR SELECT USING (true);
CREATE POLICY "Coaches can insert own credentials" ON public.cs_coach_credentials FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can update own credentials" ON public.cs_coach_credentials FOR UPDATE USING ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can delete own credentials" ON public.cs_coach_credentials FOR DELETE USING ((select auth.uid()) = coach_id);

-- Services: Public read, coach manage
CREATE POLICY "Services are viewable by everyone" ON public.cs_coach_services FOR SELECT USING (true);
CREATE POLICY "Coaches can insert own services" ON public.cs_coach_services FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can update own services" ON public.cs_coach_services FOR UPDATE USING ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can delete own services" ON public.cs_coach_services FOR DELETE USING ((select auth.uid()) = coach_id);

-- Platform stats: Public read
CREATE POLICY "Platform stats are viewable by everyone" ON public.cs_platform_stats FOR SELECT USING (true);

-- Promo codes: Public read active codes
CREATE POLICY "Active promo codes are viewable" ON public.cs_promo_codes FOR SELECT USING (is_active = true);

-- Session notes: Coach and involved client can view
CREATE POLICY "Coaches can view own notes" ON public.cs_session_notes FOR SELECT USING ((select auth.uid()) = coach_id);
CREATE POLICY "Clients can view shared notes" ON public.cs_session_notes FOR SELECT USING (
    (select auth.uid()) = client_id AND is_private = false
);
CREATE POLICY "Coaches can insert notes" ON public.cs_session_notes FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can update own notes" ON public.cs_session_notes FOR UPDATE USING ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can delete own notes" ON public.cs_session_notes FOR DELETE USING ((select auth.uid()) = coach_id);

-- Referrals: Users can view own referrals
CREATE POLICY "Users can view own referrals" ON public.cs_referrals FOR SELECT USING ((select auth.uid()) = referrer_id);
CREATE POLICY "Users can create referrals" ON public.cs_referrals FOR INSERT WITH CHECK ((select auth.uid()) = referrer_id);

-- =============================================
-- 12. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_coaches_trust_score ON public.cs_coaches(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_coaches_video ON public.cs_coaches(video_intro_url) WHERE video_intro_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coaches_featured ON public.cs_coaches(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_coaches_verified ON public.cs_coaches(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_credentials_coach ON public.cs_coach_credentials(coach_id);
CREATE INDEX IF NOT EXISTS idx_services_coach ON public.cs_coach_services(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_coach ON public.cs_session_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_client ON public.cs_session_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.cs_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.cs_promo_codes(code);

-- =============================================
-- 13. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION calculate_trust_score TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_profile_completion TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_platform_stats TO authenticated;
