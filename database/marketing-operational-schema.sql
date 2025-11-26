-- =====================================================
-- MARKETING & OPERATIONAL FEATURES - Production Ready
-- Referrals, Promo Codes, Analytics, Monitoring
-- =====================================================

-- =====================================================
-- MARKETING: REFERRAL PROGRAM
-- =====================================================

-- Referral codes (each user gets a unique code)
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,

    -- Stats
    total_uses INTEGER DEFAULT 0,
    total_rewards_earned DECIMAL(10,2) DEFAULT 0.00,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT referral_code_format CHECK (code ~ '^[A-Z0-9]{6,12}$')
);

-- Enhanced referrals table (already exists, but let's add more fields)
DO $$
BEGIN
    -- Add new columns to existing referrals table if they don't exist
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referral_code TEXT;
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'credit'; -- 'credit', 'discount', 'free_session'
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_value DECIMAL(10,2) DEFAULT 10.00;
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_user_purchased BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_paid_at TIMESTAMPTZ;
END $$;

-- Referral rewards ledger
CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.users(id),
    referral_id UUID NOT NULL REFERENCES public.referrals(id),

    reward_type TEXT NOT NULL, -- 'credit', 'discount', 'cash'
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'expired'
    expires_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MARKETING: PROMO CODES (Enhanced)
-- =====================================================

-- Add more fields to existing promo_codes table
DO $$
BEGIN
    ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS minimum_purchase DECIMAL(10,2);
    ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 1; -- uses per user
    ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS applicable_to TEXT DEFAULT 'all'; -- 'all', 'first_booking', 'coaches_only'
    ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);
END $$;

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS public.promo_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    booking_id UUID REFERENCES public.bookings(id),

    discount_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    used_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(promo_code_id, user_id, booking_id)
);

-- =====================================================
-- ANALYTICS & TRACKING
-- =====================================================

-- User activity log
CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

    activity_type TEXT NOT NULL, -- 'page_view', 'search', 'booking', 'message', etc.
    activity_data JSONB DEFAULT '{}',

    -- Context
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform metrics (aggregated daily)
CREATE TABLE IF NOT EXISTS public.platform_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL UNIQUE,

    -- User metrics
    new_users_count INTEGER DEFAULT 0,
    active_users_count INTEGER DEFAULT 0,
    new_coaches_count INTEGER DEFAULT 0,

    -- Booking metrics
    bookings_created INTEGER DEFAULT 0,
    bookings_completed INTEGER DEFAULT 0,
    bookings_cancelled INTEGER DEFAULT 0,

    -- Financial metrics
    total_gmv DECIMAL(12,2) DEFAULT 0.00, -- Gross Merchandise Value
    platform_revenue DECIMAL(12,2) DEFAULT 0.00,
    coach_earnings DECIMAL(12,2) DEFAULT 0.00,

    -- Engagement metrics
    searches_count INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    reviews_posted INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach performance metrics
CREATE TABLE IF NOT EXISTS public.coach_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,

    -- Profile metrics
    profile_views INTEGER DEFAULT 0,
    profile_favorites INTEGER DEFAULT 0,

    -- Booking metrics
    bookings_received INTEGER DEFAULT 0,
    bookings_completed INTEGER DEFAULT 0,
    booking_conversion_rate DECIMAL(5,2) DEFAULT 0.00,

    -- Financial metrics
    revenue DECIMAL(10,2) DEFAULT 0.00,
    avg_session_price DECIMAL(10,2) DEFAULT 0.00,

    -- Quality metrics
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    reviews_received INTEGER DEFAULT 0,
    response_time_hours INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, metric_date)
);

-- =====================================================
-- OPERATIONAL: SYSTEM HEALTH
-- =====================================================

-- System health checks
CREATE TABLE IF NOT EXISTS public.health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_type TEXT NOT NULL, -- 'database', 'storage', 'api', 'email'
    status TEXT NOT NULL, -- 'healthy', 'degraded', 'down'

    response_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',

    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error logs
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    error_type TEXT NOT NULL, -- 'database', 'api', 'payment', 'email'
    error_code TEXT,
    error_message TEXT NOT NULL,
    stack_trace TEXT,

    -- Context
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    endpoint TEXT,
    request_data JSONB,

    -- Metadata
    ip_address INET,
    user_agent TEXT,
    severity TEXT DEFAULT 'error', -- 'info', 'warning', 'error', 'critical'

    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email queue (for async sending)
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    template_name TEXT NOT NULL,
    template_data JSONB DEFAULT '{}',

    status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed'
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)

    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,

    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADMIN & MODERATION
-- =====================================================

-- Admin actions log
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id),

    action_type TEXT NOT NULL, -- 'verify_coach', 'ban_user', 'approve_review', etc.
    target_type TEXT NOT NULL, -- 'user', 'coach', 'review', 'booking'
    target_id UUID NOT NULL,

    action_data JSONB DEFAULT '{}',
    reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform settings (key-value store)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications preferences (enhanced)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,

    -- Email notifications
    email_booking_confirmed BOOLEAN DEFAULT TRUE,
    email_booking_reminder BOOLEAN DEFAULT TRUE,
    email_messages BOOLEAN DEFAULT TRUE,
    email_reviews BOOLEAN DEFAULT TRUE,
    email_marketing BOOLEAN DEFAULT FALSE,

    -- Push notifications (for mobile app)
    push_enabled BOOLEAN DEFAULT FALSE,
    push_booking_updates BOOLEAN DEFAULT TRUE,
    push_messages BOOLEAN DEFAULT TRUE,

    -- Frequency
    digest_frequency TEXT DEFAULT 'daily', -- 'real_time', 'daily', 'weekly', 'never'

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_promo_usage_user ON public.promo_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_code ON public.promo_code_usage(promo_code_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_user ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON public.user_activity(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON public.platform_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_metrics_coach_date ON public.coach_metrics(coach_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_health_checks_type ON public.health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_created ON public.health_checks(checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON public.error_logs(resolved) WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON public.email_queue(scheduled_for) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON public.admin_actions(action_type);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Referral codes: users can view their own
DROP POLICY IF EXISTS "Users can view own referral code" ON public.referral_codes;
CREATE POLICY "Users can view own referral code" ON public.referral_codes
    FOR SELECT USING (auth.uid() = user_id);

-- Referral rewards: users can view their own rewards
DROP POLICY IF EXISTS "Users can view own rewards" ON public.referral_rewards;
CREATE POLICY "Users can view own rewards" ON public.referral_rewards
    FOR SELECT USING (auth.uid() = referrer_id);

-- Promo code usage: users can view their own usage
DROP POLICY IF EXISTS "Users can view own promo usage" ON public.promo_code_usage;
CREATE POLICY "Users can view own promo usage" ON public.promo_code_usage
    FOR SELECT USING (auth.uid() = user_id);

-- User activity: users can view their own activity
DROP POLICY IF EXISTS "Users can view own activity" ON public.user_activity;
CREATE POLICY "Users can view own activity" ON public.user_activity
    FOR SELECT USING (auth.uid() = user_id);

-- Notification preferences: users can manage their own
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Check if code exists, regenerate if it does
    IF EXISTS (SELECT 1 FROM public.referral_codes WHERE code = result) THEN
        RETURN generate_referral_code();
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-create referral code for new users
CREATE OR REPLACE FUNCTION create_referral_code_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (NEW.id, generate_referral_code())
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_referral_code ON public.users;
CREATE TRIGGER trigger_create_referral_code
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_referral_code_for_user();

-- Auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_notification_prefs ON public.users;
CREATE TRIGGER trigger_create_notification_prefs
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_notification_preferences();

-- Update referral code usage stats
CREATE OR REPLACE FUNCTION update_referral_code_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.referral_codes
    SET total_uses = total_uses + 1
    WHERE user_id = NEW.referrer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_referral_stats ON public.referrals;
CREATE TRIGGER trigger_update_referral_stats
    AFTER INSERT ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_code_stats();

-- Update promo code usage count
CREATE OR REPLACE FUNCTION update_promo_code_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.promo_codes
    SET times_used = times_used + 1
    WHERE id = NEW.promo_code_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_promo_usage ON public.promo_code_usage;
CREATE TRIGGER trigger_update_promo_usage
    AFTER INSERT ON public.promo_code_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_promo_code_usage();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Validate promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
    p_code TEXT,
    p_user_id UUID,
    p_booking_amount DECIMAL DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    promo RECORD;
    usage_count INTEGER;
    result JSON;
BEGIN
    -- Get promo code details
    SELECT * INTO promo
    FROM public.promo_codes
    WHERE code = p_code
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until >= NOW());

    IF NOT FOUND THEN
        RETURN json_build_object('valid', false, 'error', 'Invalid or expired code');
    END IF;

    -- Check max uses
    IF promo.max_uses IS NOT NULL AND promo.times_used >= promo.max_uses THEN
        RETURN json_build_object('valid', false, 'error', 'Code has reached maximum uses');
    END IF;

    -- Check user usage limit
    SELECT COUNT(*) INTO usage_count
    FROM public.promo_code_usage
    WHERE promo_code_id = promo.id AND user_id = p_user_id;

    IF promo.user_limit IS NOT NULL AND usage_count >= promo.user_limit THEN
        RETURN json_build_object('valid', false, 'error', 'You have already used this code');
    END IF;

    -- Check minimum purchase
    IF promo.minimum_purchase IS NOT NULL AND p_booking_amount < promo.minimum_purchase THEN
        RETURN json_build_object(
            'valid', false,
            'error', format('Minimum purchase of €%.2f required', promo.minimum_purchase)
        );
    END IF;

    -- Calculate discount
    DECLARE
        discount_amount DECIMAL;
    BEGIN
        IF promo.discount_type = 'percentage' THEN
            discount_amount := p_booking_amount * (promo.discount_value / 100);
        ELSE
            discount_amount := promo.discount_value;
        END IF;

        RETURN json_build_object(
            'valid', true,
            'discount_type', promo.discount_type,
            'discount_value', promo.discount_value,
            'discount_amount', LEAST(discount_amount, p_booking_amount),
            'description', promo.description
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user referral stats
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'referral_code', rc.code,
            'total_referrals', COUNT(DISTINCT r.id),
            'successful_referrals', COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed'),
            'pending_referrals', COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'pending'),
            'total_rewards', COALESCE(SUM(rr.amount) FILTER (WHERE rr.status = 'paid'), 0),
            'pending_rewards', COALESCE(SUM(rr.amount) FILTER (WHERE rr.status = 'pending'), 0)
        )
        FROM public.referral_codes rc
        LEFT JOIN public.referrals r ON r.referrer_id = p_user_id
        LEFT JOIN public.referral_rewards rr ON rr.referrer_id = p_user_id
        WHERE rc.user_id = p_user_id
        GROUP BY rc.code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEED DEFAULT PLATFORM SETTINGS
-- =====================================================

INSERT INTO public.platform_settings (key, value, description)
VALUES
    ('commission_rate', '{"standard": 15, "founding": 10, "premium": 12}', 'Platform commission rates by tier'),
    ('referral_reward', '{"referrer": 10, "referred": 10, "currency": "EUR"}', 'Referral rewards configuration'),
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
    ('allow_new_registrations', 'true', 'Allow new user registrations'),
    ('max_upload_size_mb', '5', 'Maximum file upload size in MB'),
    ('session_timeout_minutes', '60', 'User session timeout'),
    ('email_from', '{"name": "CoachSearching", "email": "noreply@coachsearching.com"}', 'Default email sender')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Marketing & Operational features installed!';
    RAISE NOTICE '';
    RAISE NOTICE 'New Features:';
    RAISE NOTICE '  📢 Referral Program - Share & earn rewards';
    RAISE NOTICE '  🎟️  Promo Codes - Discount system';
    RAISE NOTICE '  📊 Analytics - User & platform metrics';
    RAISE NOTICE '  🏥 Health Checks - System monitoring';
    RAISE NOTICE '  📝 Error Logging - Track & debug issues';
    RAISE NOTICE '  ⚙️  Platform Settings - Configuration management';
    RAISE NOTICE '';
    RAISE NOTICE 'Your marketplace is production-ready! 🚀';
    RAISE NOTICE '';
END $$;
