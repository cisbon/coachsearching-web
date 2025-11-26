-- =====================================================
-- COACHSEARCHING.COM - Complete Database Schema
-- Supabase PostgreSQL with Row Level Security (RLS)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('client', 'coach', 'business', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE meeting_type AS ENUM ('virtual', 'onsite');
CREATE TYPE service_type AS ENUM ('single_session', 'package', 'fit_call');
CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
CREATE TYPE notification_type AS ENUM ('booking', 'message', 'review', 'payment', 'system');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'rewarded');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Extended user profiles (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'client',
    language_preference TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    phone TEXT,

    -- GDPR & Legal
    gdpr_consent_at TIMESTAMPTZ,
    terms_accepted_at TIMESTAMPTZ,
    marketing_consent BOOLEAN DEFAULT FALSE,

    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,

    -- Metadata
    signup_source TEXT,
    referral_code TEXT,
    referred_by UUID REFERENCES public.users(id)
);

-- Coach profiles
CREATE TABLE public.coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

    -- Profile Information
    headline TEXT,
    bio TEXT,
    banner_url TEXT,
    slug TEXT UNIQUE,

    -- Professional Details
    specialties TEXT[] DEFAULT '{}',
    years_experience INTEGER,
    certifications JSONB DEFAULT '[]',
    languages_spoken TEXT[] DEFAULT '{}',

    -- Location
    location_city TEXT,
    location_country TEXT,
    location_coordinates POINT,

    -- Service Options
    offers_virtual BOOLEAN DEFAULT TRUE,
    offers_onsite BOOLEAN DEFAULT FALSE,

    -- Pricing
    hourly_rate DECIMAL(10,2),
    currency TEXT DEFAULT 'EUR',

    -- Stripe Integration
    stripe_account_id TEXT UNIQUE,
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    stripe_charges_enabled BOOLEAN DEFAULT FALSE,
    stripe_payouts_enabled BOOLEAN DEFAULT FALSE,

    -- Verification & Quality
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    verification_badge_type TEXT,
    profile_completion_percentage INTEGER DEFAULT 0,

    -- Statistics
    total_reviews INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_sessions_completed INTEGER DEFAULT 0,
    pro_bono_hours_total DECIMAL(10,2) DEFAULT 0,
    profile_views INTEGER DEFAULT 0,

    -- Settings
    auto_accept_bookings BOOLEAN DEFAULT FALSE,
    buffer_time_minutes INTEGER DEFAULT 0,
    max_advance_booking_days INTEGER DEFAULT 90,
    cancellation_policy TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    last_booking_at TIMESTAMPTZ
);

-- Coach availability (weekly recurring)
CREATE TABLE public.coach_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,

    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Coach availability overrides (specific dates)
CREATE TABLE public.coach_availability_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,

    date DATE NOT NULL,
    is_available BOOLEAN DEFAULT FALSE,
    start_time TIME,
    end_time TIME,
    reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(coach_id, date)
);

-- Services/Packages offered by coaches
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    description TEXT,
    service_type service_type NOT NULL,

    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    sessions_included INTEGER DEFAULT 1,

    is_virtual BOOLEAN DEFAULT TRUE,
    is_onsite BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Participants
    client_id UUID NOT NULL REFERENCES public.users(id),
    coach_id UUID NOT NULL REFERENCES public.coaches(id),
    service_id UUID REFERENCES public.services(id),

    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    timezone TEXT NOT NULL,

    -- Status
    status booking_status DEFAULT 'pending',

    -- Meeting Details
    meeting_type meeting_type NOT NULL,
    meeting_link TEXT,
    meeting_location TEXT,

    -- Notes
    client_notes TEXT,
    coach_notes TEXT,
    internal_notes TEXT,

    -- Payment
    stripe_payment_intent_id TEXT,
    amount_paid DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    coach_payout DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    -- Cancellation/Rescheduling
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.users(id),
    cancellation_reason TEXT,
    rescheduled_from_booking_id UUID REFERENCES public.bookings(id),

    -- Completion
    completed_at TIMESTAMPTZ,
    no_show_reported_by UUID REFERENCES public.users(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_booking_time CHECK (scheduled_at > created_at)
);

-- Reviews
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id),
    coach_id UUID NOT NULL REFERENCES public.coaches(id),

    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,

    is_verified_booking BOOLEAN DEFAULT TRUE,

    -- Coach Response
    coach_response TEXT,
    coach_responded_at TIMESTAMPTZ,

    -- Moderation
    is_published BOOLEAN DEFAULT TRUE,
    moderation_status moderation_status DEFAULT 'approved',
    moderated_by UUID REFERENCES public.users(id),
    moderated_at TIMESTAMPTZ,
    moderation_notes TEXT,

    -- Flags
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles (Coach blog posts)
CREATE TABLE public.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    slug TEXT NOT NULL,

    content_markdown TEXT,
    content_html TEXT,
    excerpt TEXT,

    featured_image_url TEXT,

    status article_status DEFAULT 'draft',

    -- SEO
    meta_title TEXT,
    meta_description TEXT,

    -- Stats
    view_count INTEGER DEFAULT 0,

    -- Publishing
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(coach_id, slug)
);

-- Pro Bono Slots
CREATE TABLE public.pro_bono_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,

    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,

    description TEXT,

    is_booked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_pro_bono_time CHECK (end_time > start_time)
);

-- Pro Bono Bookings
CREATE TABLE public.pro_bono_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    slot_id UUID NOT NULL REFERENCES public.pro_bono_slots(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id),

    status booking_status DEFAULT 'confirmed',

    meeting_link TEXT,
    client_notes TEXT,

    completed_at TIMESTAMPTZ,
    hours_credited DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MESSAGING & COMMUNICATION
-- =====================================================

-- Conversations
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    participant_1_id UUID NOT NULL REFERENCES public.users(id),
    participant_2_id UUID NOT NULL REFERENCES public.users(id),

    booking_id UUID REFERENCES public.bookings(id),

    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT different_participants CHECK (participant_1_id != participant_2_id),
    UNIQUE(participant_1_id, participant_2_id)
);

-- Messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

    sender_id UUID NOT NULL REFERENCES public.users(id),
    recipient_id UUID NOT NULL REFERENCES public.users(id),

    content TEXT NOT NULL,

    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    is_system_message BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT,

    data JSONB DEFAULT '{}',

    action_url TEXT,

    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DISCOVERY & FAVORITES
-- =====================================================

-- Favorites (Saved coaches)
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(client_id, coach_id)
);

-- Recently Viewed Coaches
CREATE TABLE public.coach_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

    ip_address INET,
    user_agent TEXT,

    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search History (for recommendations)
CREATE TABLE public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,

    search_query TEXT,
    filters JSONB,

    results_count INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FINANCIAL
-- =====================================================

-- Invoices
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    client_id UUID NOT NULL REFERENCES public.users(id),
    coach_id UUID NOT NULL REFERENCES public.coaches(id),

    invoice_number TEXT NOT NULL UNIQUE,

    subtotal DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    stripe_invoice_id TEXT,
    pdf_url TEXT,

    issued_at TIMESTAMPTZ DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payouts (to coaches)
CREATE TABLE public.payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    coach_id UUID NOT NULL REFERENCES public.coaches(id),

    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    stripe_payout_id TEXT,

    status TEXT DEFAULT 'pending',

    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    arrival_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- Refunds
CREATE TABLE public.refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    booking_id UUID NOT NULL REFERENCES public.bookings(id),

    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    reason TEXT,
    stripe_refund_id TEXT,

    status TEXT DEFAULT 'pending',

    requested_by UUID NOT NULL REFERENCES public.users(id),
    approved_by UUID REFERENCES public.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Promo Codes
CREATE TABLE public.promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    code TEXT NOT NULL UNIQUE,

    discount_type discount_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,

    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,

    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,

    created_by UUID REFERENCES public.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo Code Usage
CREATE TABLE public.promo_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    booking_id UUID REFERENCES public.bookings(id),

    discount_applied DECIMAL(10,2) NOT NULL,

    used_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(promo_code_id, user_id, booking_id)
);

-- =====================================================
-- MARKETING & GROWTH
-- =====================================================

-- Referrals
CREATE TABLE public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    referrer_id UUID NOT NULL REFERENCES public.users(id),
    referred_user_id UUID REFERENCES public.users(id),

    referral_code TEXT NOT NULL UNIQUE,

    status referral_status DEFAULT 'pending',

    reward_amount DECIMAL(10,2),
    reward_currency TEXT DEFAULT 'EUR',
    reward_paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Email Capture (for non-logged visitors)
CREATE TABLE public.email_captures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    email TEXT NOT NULL,
    source TEXT,

    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(email)
);

-- =====================================================
-- LEGAL & COMPLIANCE
-- =====================================================

-- Terms Acceptance Log
CREATE TABLE public.terms_acceptance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES public.users(id),

    terms_version TEXT NOT NULL,
    ip_address INET,

    accepted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach-Client Agreements
CREATE TABLE public.agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    coach_id UUID NOT NULL REFERENCES public.coaches(id),
    client_id UUID NOT NULL REFERENCES public.users(id),

    agreement_text TEXT NOT NULL,
    agreement_version TEXT,

    signed_by_client_at TIMESTAMPTZ,
    signed_by_coach_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Export Requests (GDPR)
CREATE TABLE public.data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES public.users(id),

    status TEXT DEFAULT 'pending',
    export_url TEXT,

    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Account Deletion Requests
CREATE TABLE public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES public.users(id),

    reason TEXT,

    status TEXT DEFAULT 'pending',

    requested_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_deletion_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- SYSTEM & ADMIN
-- =====================================================

-- Feature Flags
CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL UNIQUE,
    description TEXT,

    enabled BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES public.users(id),

    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,

    old_values JSONB,
    new_values JSONB,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report/Flag System
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    reporter_id UUID NOT NULL REFERENCES public.users(id),

    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,

    reason TEXT NOT NULL,
    description TEXT,

    status moderation_status DEFAULT 'pending',

    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_referral_code ON public.users(referral_code);

-- Coaches
CREATE INDEX idx_coaches_user_id ON public.coaches(user_id);
CREATE INDEX idx_coaches_slug ON public.coaches(slug);
CREATE INDEX idx_coaches_is_verified ON public.coaches(is_verified);
CREATE INDEX idx_coaches_specialties ON public.coaches USING GIN(specialties);
CREATE INDEX idx_coaches_location ON public.coaches(location_city, location_country);
CREATE INDEX idx_coaches_rating ON public.coaches(average_rating DESC);

-- Availability
CREATE INDEX idx_coach_availability_coach_day ON public.coach_availability(coach_id, day_of_week);
CREATE INDEX idx_coach_availability_overrides_coach_date ON public.coach_availability_overrides(coach_id, date);

-- Bookings
CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_coach ON public.bookings(coach_id);
CREATE INDEX idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Reviews
CREATE INDEX idx_reviews_coach ON public.reviews(coach_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_is_published ON public.reviews(is_published);

-- Articles
CREATE INDEX idx_articles_coach ON public.articles(coach_id);
CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_status ON public.articles(status);

-- Messages
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);

-- Notifications
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Favorites
CREATE INDEX idx_favorites_client ON public.favorites(client_id);
CREATE INDEX idx_favorites_coach ON public.favorites(coach_id);

-- Coach Views
CREATE INDEX idx_coach_views_coach ON public.coach_views(coach_id);
CREATE INDEX idx_coach_views_viewer ON public.coach_views(viewer_id);
CREATE INDEX idx_coach_views_viewed_at ON public.coach_views(viewed_at DESC);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at BEFORE UPDATE ON public.coaches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update coach statistics when review is added
CREATE OR REPLACE FUNCTION update_coach_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.coaches
    SET
        total_reviews = (
            SELECT COUNT(*)
            FROM public.reviews
            WHERE coach_id = NEW.coach_id AND is_published = TRUE
        ),
        average_rating = (
            SELECT AVG(rating)::DECIMAL(3,2)
            FROM public.reviews
            WHERE coach_id = NEW.coach_id AND is_published = TRUE
        )
    WHERE id = NEW.coach_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_stats_on_review
    AFTER INSERT OR UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_review_stats();

-- Update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100)
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Mark pro bono slot as booked
CREATE OR REPLACE FUNCTION mark_pro_bono_slot_booked()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.pro_bono_slots
    SET is_booked = TRUE
    WHERE id = NEW.slot_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_slot_booked_on_booking
    AFTER INSERT ON public.pro_bono_bookings
    FOR EACH ROW
    EXECUTE FUNCTION mark_pro_bono_slot_booked();

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE invoice_number_seq;

CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL)
    EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_bono_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_bono_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS POLICIES
-- =====================================================

-- Users can read their own data
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Anyone can view basic user info (for display purposes)
CREATE POLICY "Anyone can view basic user info"
    ON public.users FOR SELECT
    USING (TRUE);

-- =====================================================
-- COACHES POLICIES
-- =====================================================

-- Anyone can view published coach profiles
CREATE POLICY "Anyone can view coach profiles"
    ON public.coaches FOR SELECT
    USING (TRUE);

-- Coaches can update their own profile
CREATE POLICY "Coaches can update own profile"
    ON public.coaches FOR UPDATE
    USING (auth.uid() = user_id);

-- Coaches can insert their own profile
CREATE POLICY "Coaches can create own profile"
    ON public.coaches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- AVAILABILITY POLICIES
-- =====================================================

-- Anyone can view coach availability
CREATE POLICY "Anyone can view availability"
    ON public.coach_availability FOR SELECT
    USING (TRUE);

-- Coaches can manage their own availability
CREATE POLICY "Coaches can manage own availability"
    ON public.coach_availability FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- Similar for overrides
CREATE POLICY "Anyone can view availability overrides"
    ON public.coach_availability_overrides FOR SELECT
    USING (TRUE);

CREATE POLICY "Coaches can manage own overrides"
    ON public.coach_availability_overrides FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- SERVICES POLICIES
-- =====================================================

-- Anyone can view active services
CREATE POLICY "Anyone can view services"
    ON public.services FOR SELECT
    USING (is_active = TRUE OR EXISTS (
        SELECT 1 FROM public.coaches
        WHERE id = coach_id AND user_id = auth.uid()
    ));

-- Coaches can manage their own services
CREATE POLICY "Coaches can manage own services"
    ON public.services FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- BOOKINGS POLICIES
-- =====================================================

-- Users can view their own bookings (as client or coach)
CREATE POLICY "Users can view own bookings"
    ON public.bookings FOR SELECT
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- Clients can create bookings
CREATE POLICY "Clients can create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (client_id = auth.uid());

-- Clients and coaches can update their bookings
CREATE POLICY "Participants can update bookings"
    ON public.bookings FOR UPDATE
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- REVIEWS POLICIES
-- =====================================================

-- Anyone can view published reviews
CREATE POLICY "Anyone can view published reviews"
    ON public.reviews FOR SELECT
    USING (is_published = TRUE OR client_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.coaches
        WHERE id = coach_id AND user_id = auth.uid()
    ));

-- Clients can create reviews for their bookings
CREATE POLICY "Clients can create reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (
        client_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE id = booking_id AND status = 'completed'
        )
    );

-- Coaches can respond to reviews
CREATE POLICY "Coaches can respond to reviews"
    ON public.reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- ARTICLES POLICIES
-- =====================================================

-- Anyone can view published articles
CREATE POLICY "Anyone can view published articles"
    ON public.articles FOR SELECT
    USING (status = 'published' OR EXISTS (
        SELECT 1 FROM public.coaches
        WHERE id = coach_id AND user_id = auth.uid()
    ));

-- Coaches can manage their own articles
CREATE POLICY "Coaches can manage own articles"
    ON public.articles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- PRO BONO POLICIES
-- =====================================================

-- Anyone can view available pro bono slots
CREATE POLICY "Anyone can view pro bono slots"
    ON public.pro_bono_slots FOR SELECT
    USING (TRUE);

-- Coaches can manage their own slots
CREATE POLICY "Coaches can manage own pro bono slots"
    ON public.pro_bono_slots FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- Users can view their own pro bono bookings
CREATE POLICY "Users can view own pro bono bookings"
    ON public.pro_bono_bookings FOR SELECT
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.pro_bono_slots ps
            JOIN public.coaches c ON c.id = ps.coach_id
            WHERE ps.id = slot_id AND c.user_id = auth.uid()
        )
    );

-- Clients can create pro bono bookings
CREATE POLICY "Clients can book pro bono slots"
    ON public.pro_bono_bookings FOR INSERT
    WITH CHECK (client_id = auth.uid());

-- =====================================================
-- MESSAGING POLICIES
-- =====================================================

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

-- Users can create conversations
CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

-- Users can view messages in their conversations
CREATE POLICY "Users can view own messages"
    ON public.messages FOR SELECT
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can send messages
CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (sender_id = auth.uid());

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- FAVORITES POLICIES
-- =====================================================

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
    ON public.favorites FOR SELECT
    USING (client_id = auth.uid());

-- Users can manage their own favorites
CREATE POLICY "Users can manage own favorites"
    ON public.favorites FOR ALL
    USING (client_id = auth.uid());

-- =====================================================
-- COACH VIEWS POLICIES
-- =====================================================

-- Anyone can create coach views
CREATE POLICY "Anyone can create coach views"
    ON public.coach_views FOR INSERT
    WITH CHECK (TRUE);

-- Coaches can view their own profile views
CREATE POLICY "Coaches can view own profile views"
    ON public.coach_views FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- FINANCIAL POLICIES
-- =====================================================

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- Coaches can view their own payouts
CREATE POLICY "Coaches can view own payouts"
    ON public.payouts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- Users can view refunds for their bookings
CREATE POLICY "Users can view own refunds"
    ON public.refunds FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id AND (
                b.client_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.coaches c
                    WHERE c.id = b.coach_id AND c.user_id = auth.uid()
                )
            )
        )
    );

-- =====================================================
-- PROMO CODES POLICIES
-- =====================================================

-- Anyone can view active promo codes
CREATE POLICY "Anyone can view promo codes"
    ON public.promo_codes FOR SELECT
    USING (is_active = TRUE);

-- =====================================================
-- REFERRALS POLICIES
-- =====================================================

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals"
    ON public.referrals FOR SELECT
    USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

-- Users can create referrals
CREATE POLICY "Users can create referrals"
    ON public.referrals FOR INSERT
    WITH CHECK (referrer_id = auth.uid());

-- =====================================================
-- LEGAL & COMPLIANCE POLICIES
-- =====================================================

-- Users can view their own data export requests
CREATE POLICY "Users can view own data export requests"
    ON public.data_export_requests FOR SELECT
    USING (user_id = auth.uid());

-- Users can create data export requests
CREATE POLICY "Users can create data export requests"
    ON public.data_export_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can view their own deletion requests
CREATE POLICY "Users can view own deletion requests"
    ON public.account_deletion_requests FOR SELECT
    USING (user_id = auth.uid());

-- Users can create deletion requests
CREATE POLICY "Users can create deletion requests"
    ON public.account_deletion_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- REPORTS POLICIES
-- =====================================================

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
    ON public.reports FOR SELECT
    USING (reporter_id = auth.uid());

-- Users can create reports
CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    WITH CHECK (reporter_id = auth.uid());

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default feature flags
INSERT INTO public.feature_flags (name, description, enabled) VALUES
    ('booking_system', 'Enable booking system', TRUE),
    ('messaging', 'Enable in-app messaging', TRUE),
    ('pro_bono', 'Enable pro bono slots', TRUE),
    ('articles', 'Enable coach articles', TRUE),
    ('reviews', 'Enable review system', TRUE),
    ('referrals', 'Enable referral program', FALSE),
    ('promo_codes', 'Enable promo codes', TRUE)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for coach search with filters
CREATE OR REPLACE VIEW coach_search_view AS
SELECT
    c.*,
    u.full_name,
    u.avatar_url,
    COALESCE(c.average_rating, 0) as rating,
    COALESCE(c.total_reviews, 0) as reviews_count,
    array_agg(DISTINCT s.service_type) FILTER (WHERE s.is_active) as available_service_types
FROM public.coaches c
JOIN public.users u ON u.id = c.user_id
LEFT JOIN public.services s ON s.coach_id = c.id
WHERE u.is_active = TRUE
GROUP BY c.id, u.full_name, u.avatar_url;

-- View for upcoming bookings
CREATE OR REPLACE VIEW upcoming_bookings_view AS
SELECT
    b.*,
    u_client.full_name as client_name,
    u_client.email as client_email,
    u_coach.full_name as coach_name,
    u_coach.email as coach_email,
    s.title as service_title
FROM public.bookings b
JOIN public.users u_client ON u_client.id = b.client_id
JOIN public.coaches c ON c.id = b.coach_id
JOIN public.users u_coach ON u_coach.id = c.user_id
LEFT JOIN public.services s ON s.id = b.service_id
WHERE b.status IN ('pending', 'confirmed')
AND b.scheduled_at > NOW();

-- =====================================================
-- COMPLETED!
-- =====================================================
