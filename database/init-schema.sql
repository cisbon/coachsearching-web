-- =====================================================
-- COACHSEARCHING.COM - Database Initialization
-- For FRESH Supabase instances - Copy & Paste into SQL Editor
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS - Safe creation
-- =====================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'coach', 'business', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meeting_type AS ENUM ('virtual', 'onsite');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('single_session', 'package', 'fit_call');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('booking', 'message', 'review', 'payment', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'rewarded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Extended user profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'client',
    language_preference TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    phone TEXT,
    gdpr_consent_at TIMESTAMPTZ,
    terms_accepted_at TIMESTAMPTZ,
    marketing_consent BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    signup_source TEXT,
    referral_code TEXT,
    referred_by UUID REFERENCES public.users(id)
);

-- Coach profiles
CREATE TABLE IF NOT EXISTS public.coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    headline TEXT,
    bio TEXT,
    banner_url TEXT,
    slug TEXT UNIQUE,
    specialties TEXT[] DEFAULT '{}',
    years_experience INTEGER,
    certifications JSONB DEFAULT '[]',
    languages_spoken TEXT[] DEFAULT '{}',
    location_city TEXT,
    location_country TEXT,
    location_coordinates POINT,
    offers_virtual BOOLEAN DEFAULT TRUE,
    offers_onsite BOOLEAN DEFAULT FALSE,
    hourly_rate DECIMAL(10,2),
    currency TEXT DEFAULT 'EUR',
    stripe_account_id TEXT UNIQUE,
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    stripe_charges_enabled BOOLEAN DEFAULT FALSE,
    stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    verification_badge_type TEXT,
    profile_completion_percentage INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    is_founding_coach BOOLEAN DEFAULT FALSE,
    founding_coach_expires_at TIMESTAMPTZ,
    commission_rate DECIMAL(5,2) DEFAULT 15.00,
    is_accepting_clients BOOLEAN DEFAULT TRUE,
    response_time_hours INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services offered by coaches
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    service_type service_type DEFAULT 'single_session',
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    meeting_type meeting_type DEFAULT 'virtual',
    is_active BOOLEAN DEFAULT TRUE,
    max_participants INTEGER DEFAULT 1,
    preparation_time_minutes INTEGER DEFAULT 0,
    buffer_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.users(id),
    coach_id UUID NOT NULL REFERENCES public.coaches(id),
    service_id UUID REFERENCES public.services(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    status booking_status DEFAULT 'pending',
    meeting_type meeting_type DEFAULT 'virtual',
    meeting_url TEXT,
    meeting_location TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.users(id),
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    platform_fee DECIMAL(10,2),
    coach_payout DECIMAL(10,2),
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID UNIQUE REFERENCES public.bookings(id),
    coach_id UUID NOT NULL REFERENCES public.coaches(id),
    client_id UUID NOT NULL REFERENCES public.users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified_booking BOOLEAN DEFAULT TRUE,
    moderation_status moderation_status DEFAULT 'pending',
    coach_response TEXT,
    coach_response_at TIMESTAMPTZ,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach availability
CREATE TABLE IF NOT EXISTS public.coach_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, day_of_week, start_time)
);

-- Availability overrides (exceptions)
CREATE TABLE IF NOT EXISTS public.availability_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_available BOOLEAN NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, date)
);

-- =====================================================
-- COMMUNICATION
-- =====================================================

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1_id UUID NOT NULL REFERENCES public.users(id),
    participant_2_id UUID NOT NULL REFERENCES public.users(id),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_1_id, participant_2_id),
    CHECK (participant_1_id < participant_2_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DISCOVERY & ENGAGEMENT
-- =====================================================

-- Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, coach_id)
);

-- Coach profile views
CREATE TABLE IF NOT EXISTS public.coach_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    viewer_ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search history
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FINANCIAL
-- =====================================================

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    booking_id UUID REFERENCES public.bookings(id),
    client_id UUID NOT NULL REFERENCES public.users(id),
    coach_id UUID NOT NULL REFERENCES public.coaches(id),
    subtotal DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'paid',
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payouts
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'pending',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    stripe_payout_id TEXT,
    arrival_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Refunds
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    reason TEXT,
    status TEXT DEFAULT 'pending',
    stripe_refund_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =====================================================
-- MARKETING
-- =====================================================

-- Promo codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER,
    times_used INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.users(id),
    referred_id UUID NOT NULL REFERENCES public.users(id),
    status referral_status DEFAULT 'pending',
    reward_amount DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(referrer_id, referred_id)
);

-- =====================================================
-- LEGAL & COMPLIANCE
-- =====================================================

-- Terms acceptance tracking
CREATE TABLE IF NOT EXISTS public.terms_acceptance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    terms_version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT
);

-- Agreements (coach contracts)
CREATE TABLE IF NOT EXISTS public.agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id),
    agreement_type TEXT NOT NULL,
    content TEXT NOT NULL,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT
);

-- GDPR data export requests
CREATE TABLE IF NOT EXISTS public.data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    download_url TEXT,
    expires_at TIMESTAMPTZ
);

-- Account deletion requests
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- =====================================================
-- CONTENT
-- =====================================================

-- Articles/Blog posts
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES public.coaches(id),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    status article_status DEFAULT 'draft',
    tags TEXT[] DEFAULT '{}',
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADMIN & OPERATIONS
-- =====================================================

-- Feature flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports (content moderation)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES public.users(id),
    reported_entity_type TEXT NOT NULL,
    reported_entity_id UUID NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status moderation_status DEFAULT 'pending',
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_coach ON public.bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

CREATE INDEX IF NOT EXISTS idx_reviews_coach ON public.reviews(coach_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_coach_views_coach ON public.coach_views(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_views_created_at ON public.coach_views(created_at DESC);

-- =====================================================
-- AUTO-UPDATE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_coaches_updated_at ON public.coaches;
    CREATE TRIGGER update_coaches_updated_at BEFORE UPDATE ON public.coaches
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
    CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
    CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Users can view own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Everyone can view published coach profiles
DROP POLICY IF EXISTS "Anyone can view coach profiles" ON public.coaches;
CREATE POLICY "Anyone can view coach profiles" ON public.coaches
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Coaches can update own profile" ON public.coaches;
CREATE POLICY "Coaches can update own profile" ON public.coaches
    FOR UPDATE USING (auth.uid() = user_id);

-- Services are publicly viewable
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
CREATE POLICY "Anyone can view services" ON public.services
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Coaches can manage own services" ON public.services;
CREATE POLICY "Coaches can manage own services" ON public.services
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.coaches WHERE id = coach_id)
    );

-- Bookings: clients and coaches can view their own
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (
        auth.uid() = client_id OR
        auth.uid() IN (SELECT user_id FROM public.coaches WHERE id = coach_id)
    );

-- Reviews are publicly viewable
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.reviews
    FOR SELECT USING (moderation_status = 'approved' AND is_visible = true);

-- Messages: only conversation participants
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT participant_1_id FROM public.conversations WHERE id = conversation_id
            UNION
            SELECT participant_2_id FROM public.conversations WHERE id = conversation_id
        )
    );

-- Notifications: users can view own
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Generate invoice number
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
    year_str TEXT;
BEGIN
    next_id := nextval('invoice_number_seq');
    year_str := TO_CHAR(NOW(), 'YYYY');
    RETURN 'INV-' || year_str || '-' || LPAD(next_id::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Calculate coach statistics
CREATE OR REPLACE FUNCTION update_coach_stats(coach_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.coaches
    SET
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM public.reviews
            WHERE coach_id = coach_uuid
              AND moderation_status = 'approved'
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM public.reviews
            WHERE coach_id = coach_uuid
              AND moderation_status = 'approved'
        ),
        total_sessions = (
            SELECT COUNT(*)
            FROM public.bookings
            WHERE coach_id = coach_uuid
              AND status = 'completed'
        ),
        total_earnings = (
            SELECT COALESCE(SUM(coach_payout), 0)
            FROM public.bookings
            WHERE coach_id = coach_uuid
              AND status = 'completed'
        )
    WHERE id = coach_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database initialization complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Go to Storage → Create bucket "profile-images" (Public)';
    RAISE NOTICE '2. Set up your authentication in the Supabase dashboard';
    RAISE NOTICE '3. Configure your environment variables';
    RAISE NOTICE '';
    RAISE NOTICE 'Your CoachSearching database is ready! 🎉';
    RAISE NOTICE '';
END $$;
