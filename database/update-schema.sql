-- =====================================================
-- COPY-PASTE THIS INTO SUPABASE SQL EDITOR
-- Execute this to update your database schema
-- =====================================================

-- This will:
-- 1. Create all missing tables
-- 2. Add new columns to existing tables
-- 3. Create indexes
-- 4. Set up RLS policies
-- 5. Add triggers and functions

-- =====================================================
-- STEP 1: Enable Extensions
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 2: Create Enums (if not exist)
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
-- STEP 3: Add new columns to existing tables
-- =====================================================

-- Add columns to users table if they don't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gdpr_consent_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_source TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Add columns to coaches table if they don't exist
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS location_coordinates POINT;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS verification_badge_type TEXT;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS total_sessions_completed INTEGER DEFAULT 0;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS auto_accept_bookings BOOLEAN DEFAULT FALSE;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS buffer_time_minutes INTEGER DEFAULT 0;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 90;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS last_booking_at TIMESTAMPTZ;

-- Add columns to bookings table if they don't exist
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rescheduled_from_booking_id UUID REFERENCES public.bookings(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS no_show_reported_by UUID REFERENCES public.users(id);

-- =====================================================
-- STEP 4: Create new tables
-- =====================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
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

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
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

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
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

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, coach_id)
);

-- Coach views table
CREATE TABLE IF NOT EXISTS public.coach_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search history table
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    search_query TEXT,
    filters JSONB,
    results_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
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

-- Payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
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

-- Refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
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

-- Promo codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
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

-- Promo code usage table
CREATE TABLE IF NOT EXISTS public.promo_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    booking_id UUID REFERENCES public.bookings(id),
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promo_code_id, user_id, booking_id)
);

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
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

-- Email captures table
CREATE TABLE IF NOT EXISTS public.email_captures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email)
);

-- Terms acceptance table
CREATE TABLE IF NOT EXISTS public.terms_acceptance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    terms_version TEXT NOT NULL,
    ip_address INET,
    accepted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach-client agreements table
CREATE TABLE IF NOT EXISTS public.agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id),
    client_id UUID NOT NULL REFERENCES public.users(id),
    agreement_text TEXT NOT NULL,
    agreement_version TEXT,
    signed_by_client_at TIMESTAMPTZ,
    signed_by_coach_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data export requests table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    status TEXT DEFAULT 'pending',
    export_url TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Account deletion requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    reason TEXT,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_deletion_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Feature flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
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

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
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
-- STEP 5: Create indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

CREATE INDEX IF NOT EXISTS idx_coaches_slug ON public.coaches(slug);
CREATE INDEX IF NOT EXISTS idx_coaches_specialties ON public.coaches USING GIN(specialties);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_favorites_client ON public.favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_favorites_coach ON public.favorites(coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_views_coach ON public.coach_views(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_views_viewer ON public.coach_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_coach_views_viewed_at ON public.coach_views(viewed_at DESC);

-- =====================================================
-- STEP 6: Create/update functions
-- =====================================================

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

-- Create trigger if not exists
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence if not exists
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON public.invoices;
CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- STEP 7: Enable RLS on new tables
-- =====================================================

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
-- STEP 8: Create RLS policies for new tables
-- =====================================================

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages"
    ON public.messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Favorites policies
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorites;
CREATE POLICY "Users can manage own favorites"
    ON public.favorites FOR ALL
    USING (auth.uid() = client_id);

-- Coach views policies
DROP POLICY IF EXISTS "Anyone can create coach views" ON public.coach_views;
CREATE POLICY "Anyone can create coach views"
    ON public.coach_views FOR INSERT
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Coaches can view own profile views" ON public.coach_views;
CREATE POLICY "Coaches can view own profile views"
    ON public.coach_views FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- Invoices policies
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- Payouts policies
DROP POLICY IF EXISTS "Coaches can view own payouts" ON public.payouts;
CREATE POLICY "Coaches can view own payouts"
    ON public.payouts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- Refunds policies
DROP POLICY IF EXISTS "Users can view own refunds" ON public.refunds;
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

-- Promo codes policies
DROP POLICY IF EXISTS "Anyone can view promo codes" ON public.promo_codes;
CREATE POLICY "Anyone can view promo codes"
    ON public.promo_codes FOR SELECT
    USING (is_active = TRUE);

-- Referrals policies
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
    ON public.referrals FOR SELECT
    USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
CREATE POLICY "Users can create referrals"
    ON public.referrals FOR INSERT
    WITH CHECK (auth.uid() = referrer_id);

-- Data export policies
DROP POLICY IF EXISTS "Users can view own data export requests" ON public.data_export_requests;
CREATE POLICY "Users can view own data export requests"
    ON public.data_export_requests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create data export requests" ON public.data_export_requests;
CREATE POLICY "Users can create data export requests"
    ON public.data_export_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Account deletion policies
DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can view own deletion requests"
    ON public.account_deletion_requests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can create deletion requests"
    ON public.account_deletion_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Reports policies
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
    ON public.reports FOR SELECT
    USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- =====================================================
-- STEP 9: Insert default feature flags
-- =====================================================

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
-- STEP 10: Create Supabase Storage bucket for profile images
-- =====================================================

-- Note: This must be done via Supabase Dashboard → Storage
-- Create bucket: 'profile-images' with Public access
-- Then run these RLS policies on storage.objects:

-- Policy for uploading images
-- CREATE POLICY "Users can upload their own profile images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'profile-images');

-- Policy for reading images
-- CREATE POLICY "Anyone can view profile images"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'profile-images');

-- =====================================================
-- COMPLETED! Database is now updated.
-- =====================================================

-- To verify everything worked, run this:
SELECT 'Database schema updated successfully!' as message;
