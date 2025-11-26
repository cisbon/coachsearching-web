-- =====================================================
-- STEP 2: CREATE COMPLETE SCHEMA WITH cs_ PREFIX
-- CoachSearching.com - Full Platform Schema
-- All tables, views, functions, and policies
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE cs_user_role AS ENUM ('client', 'coach', 'business', 'admin');
CREATE TYPE cs_booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE cs_meeting_type AS ENUM ('virtual', 'onsite');
CREATE TYPE cs_service_type AS ENUM ('single_session', 'package', 'fit_call');
CREATE TYPE cs_article_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE cs_moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
CREATE TYPE cs_notification_type AS ENUM ('booking', 'message', 'review', 'payment', 'system');
CREATE TYPE cs_discount_type AS ENUM ('percentage', 'fixed');
CREATE TYPE cs_referral_status AS ENUM ('pending', 'completed', 'rewarded');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Extended user profiles (extends auth.users)
CREATE TABLE public.cs_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role cs_user_role DEFAULT 'client',
    user_type TEXT DEFAULT 'client',

    -- Settings
    language_preference TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'EUR',
    phone TEXT,

    -- GDPR & Legal
    gdpr_consent_at TIMESTAMPTZ,
    terms_accepted_at TIMESTAMPTZ,
    marketing_consent BOOLEAN DEFAULT FALSE,

    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,

    -- Metadata
    signup_source TEXT,
    referral_code TEXT,
    referred_by UUID REFERENCES public.cs_users(id)
);

-- Coach profiles
CREATE TABLE public.cs_coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.cs_users(id) ON DELETE CASCADE,

    -- Profile Information
    full_name TEXT,
    title TEXT,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    slug TEXT UNIQUE,

    -- Professional Details
    specialties TEXT[] DEFAULT '{}',
    years_experience INTEGER,
    certifications JSONB DEFAULT '[]',
    languages TEXT[] DEFAULT '{}',

    -- Location
    location TEXT,
    location_city TEXT,
    location_country TEXT,
    location_coordinates POINT,

    -- Service Options
    session_types TEXT[] DEFAULT '{}',
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
    rating_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    total_sessions_completed INTEGER DEFAULT 0,
    pro_bono_hours_total DECIMAL(10,2) DEFAULT 0,
    profile_views INTEGER DEFAULT 0,

    -- Settings
    auto_accept_bookings BOOLEAN DEFAULT FALSE,
    buffer_time_minutes INTEGER DEFAULT 0,
    max_advance_booking_days INTEGER DEFAULT 90,
    cancellation_policy TEXT,

    -- Status
    onboarding_completed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    last_booking_at TIMESTAMPTZ
);

-- =====================================================
-- AVAILABILITY TABLES
-- =====================================================

-- Coach availability (weekly recurring)
CREATE TABLE public.cs_coach_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,

    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Coach availability overrides (specific dates)
CREATE TABLE public.cs_coach_availability_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,

    date DATE NOT NULL,
    is_available BOOLEAN DEFAULT FALSE,
    start_time TIME,
    end_time TIME,
    reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(coach_id, date)
);

-- =====================================================
-- SERVICES & BOOKINGS
-- =====================================================

-- Services/Packages offered by coaches
CREATE TABLE public.cs_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    description TEXT,
    service_type cs_service_type NOT NULL,

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
CREATE TABLE public.cs_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Participants
    client_id UUID NOT NULL REFERENCES public.cs_users(id),
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id),
    service_id UUID REFERENCES public.cs_services(id),

    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    timezone TEXT NOT NULL,

    -- Status
    status cs_booking_status DEFAULT 'pending',

    -- Meeting Details
    meeting_type cs_meeting_type NOT NULL,
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
    cancelled_by UUID REFERENCES public.cs_users(id),
    cancellation_reason TEXT,
    rescheduled_from_booking_id UUID REFERENCES public.cs_bookings(id),

    -- Completion
    completed_at TIMESTAMPTZ,
    no_show_reported_by UUID REFERENCES public.cs_users(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_booking_time CHECK (scheduled_at > created_at)
);

-- =====================================================
-- REVIEWS & FEEDBACK
-- =====================================================

-- Reviews
CREATE TABLE public.cs_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    booking_id UUID NOT NULL UNIQUE REFERENCES public.cs_bookings(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cs_users(id),
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id),

    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,

    is_verified_booking BOOLEAN DEFAULT TRUE,

    -- Coach Response
    coach_response TEXT,
    coach_responded_at TIMESTAMPTZ,

    -- Moderation
    is_published BOOLEAN DEFAULT TRUE,
    moderation_status cs_moderation_status DEFAULT 'approved',
    moderated_by UUID REFERENCES public.cs_users(id),
    moderated_at TIMESTAMPTZ,
    moderation_notes TEXT,

    -- Flags
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ARTICLES (Coach Blog)
-- =====================================================

-- Articles (Coach blog posts)
CREATE TABLE public.cs_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    slug TEXT NOT NULL,

    content_markdown TEXT,
    content_html TEXT,
    excerpt TEXT,

    featured_image_url TEXT,

    status cs_article_status DEFAULT 'draft',

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

-- =====================================================
-- PRO BONO
-- =====================================================

-- Pro Bono Slots
CREATE TABLE public.cs_pro_bono_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,

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
CREATE TABLE public.cs_pro_bono_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    slot_id UUID NOT NULL REFERENCES public.cs_pro_bono_slots(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cs_users(id),

    status cs_booking_status DEFAULT 'confirmed',

    meeting_link TEXT,
    client_notes TEXT,

    completed_at TIMESTAMPTZ,
    hours_credited DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MESSAGING
-- =====================================================

-- Conversations
CREATE TABLE public.cs_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    participant_1_id UUID NOT NULL REFERENCES public.cs_users(id),
    participant_2_id UUID NOT NULL REFERENCES public.cs_users(id),

    booking_id UUID REFERENCES public.cs_bookings(id),

    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT different_participants CHECK (participant_1_id != participant_2_id),
    UNIQUE(participant_1_id, participant_2_id)
);

-- Messages
CREATE TABLE public.cs_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.cs_conversations(id) ON DELETE CASCADE,

    sender_id UUID NOT NULL REFERENCES public.cs_users(id),
    recipient_id UUID NOT NULL REFERENCES public.cs_users(id),

    content TEXT NOT NULL,

    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    is_system_message BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.cs_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.cs_users(id) ON DELETE CASCADE,

    type cs_notification_type NOT NULL,
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
CREATE TABLE public.cs_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    client_id UUID NOT NULL REFERENCES public.cs_users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(client_id, coach_id)
);

-- Recently Viewed Coaches
CREATE TABLE public.cs_coach_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.cs_users(id) ON DELETE SET NULL,

    ip_address INET,
    user_agent TEXT,

    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search History
CREATE TABLE public.cs_search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES public.cs_users(id) ON DELETE CASCADE,

    search_query TEXT,
    filters JSONB,

    results_count INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FINANCIAL
-- =====================================================

-- Invoices
CREATE TABLE public.cs_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    booking_id UUID NOT NULL REFERENCES public.cs_bookings(id),
    client_id UUID NOT NULL REFERENCES public.cs_users(id),
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id),

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

-- Payouts
CREATE TABLE public.cs_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id),

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
CREATE TABLE public.cs_refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    booking_id UUID NOT NULL REFERENCES public.cs_bookings(id),

    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    reason TEXT,
    stripe_refund_id TEXT,

    status TEXT DEFAULT 'pending',

    requested_by UUID NOT NULL REFERENCES public.cs_users(id),
    approved_by UUID REFERENCES public.cs_users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Promo Codes
CREATE TABLE public.cs_promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    code TEXT NOT NULL UNIQUE,

    discount_type cs_discount_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,

    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,

    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,

    created_by UUID REFERENCES public.cs_users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo Code Usage
CREATE TABLE public.cs_promo_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    promo_code_id UUID NOT NULL REFERENCES public.cs_promo_codes(id),
    user_id UUID NOT NULL REFERENCES public.cs_users(id),
    booking_id UUID REFERENCES public.cs_bookings(id),

    discount_applied DECIMAL(10,2) NOT NULL,

    used_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(promo_code_id, user_id, booking_id)
);

-- =====================================================
-- MARKETING & GROWTH
-- =====================================================

-- Referrals
CREATE TABLE public.cs_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    referrer_id UUID NOT NULL REFERENCES public.cs_users(id),
    referred_user_id UUID REFERENCES public.cs_users(id),

    referral_code TEXT NOT NULL UNIQUE,

    status cs_referral_status DEFAULT 'pending',

    reward_amount DECIMAL(10,2),
    reward_currency TEXT DEFAULT 'EUR',
    reward_paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Email Capture
CREATE TABLE public.cs_email_captures (
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
CREATE TABLE public.cs_terms_acceptance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES public.cs_users(id),

    terms_version TEXT NOT NULL,
    ip_address INET,

    accepted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach-Client Agreements
CREATE TABLE public.cs_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id),
    client_id UUID NOT NULL REFERENCES public.cs_users(id),

    agreement_text TEXT NOT NULL,
    agreement_version TEXT,

    signed_by_client_at TIMESTAMPTZ,
    signed_by_coach_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Export Requests (GDPR)
CREATE TABLE public.cs_data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES public.cs_users(id),

    status TEXT DEFAULT 'pending',
    export_url TEXT,

    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Account Deletion Requests
CREATE TABLE public.cs_account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES public.cs_users(id),

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
CREATE TABLE public.cs_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL UNIQUE,
    description TEXT,

    enabled BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE public.cs_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES public.cs_users(id),

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
CREATE TABLE public.cs_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    reporter_id UUID NOT NULL REFERENCES public.cs_users(id),

    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,

    reason TEXT NOT NULL,
    description TEXT,

    status cs_moderation_status DEFAULT 'pending',

    reviewed_by UUID REFERENCES public.cs_users(id),
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Continue in next file due to size...
