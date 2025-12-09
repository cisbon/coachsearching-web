-- schema-booking.sql - Booking & Payment System
-- Database schema for coach availability, bookings, packages, and payments

-- =============================================
-- COACH AVAILABILITY (Weekly Recurring Slots)
-- =============================================
CREATE TABLE IF NOT EXISTS cs_coach_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES cs_coaches(id) ON DELETE CASCADE,

    -- Day and time
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- What can be booked in this slot
    allows_discovery_calls BOOLEAN DEFAULT true,
    allows_sessions BOOLEAN DEFAULT true,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT unique_availability_slot UNIQUE (coach_id, day_of_week, start_time, end_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_coach ON cs_coach_availability(coach_id, is_active);
CREATE INDEX IF NOT EXISTS idx_availability_day ON cs_coach_availability(day_of_week, is_active);

-- =============================================
-- COACH BLOCKED DATES
-- =============================================
CREATE TABLE IF NOT EXISTS cs_coach_blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES cs_coaches(id) ON DELETE CASCADE,

    blocked_date DATE NOT NULL,
    reason TEXT, -- "Holiday", "Vacation", etc.

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_blocked_date UNIQUE (coach_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_coach ON cs_coach_blocked_dates(coach_id, blocked_date);

-- =============================================
-- COACH BOOKING SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS cs_coach_booking_settings (
    coach_id UUID PRIMARY KEY REFERENCES cs_coaches(id) ON DELETE CASCADE,

    -- Timezone (critical for EU market)
    timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',

    -- Buffer times
    buffer_before_minutes INTEGER DEFAULT 15,
    buffer_after_minutes INTEGER DEFAULT 15,

    -- Booking windows
    min_notice_hours INTEGER DEFAULT 24,
    max_advance_days INTEGER DEFAULT 60,

    -- Discovery call settings
    discovery_call_duration_minutes INTEGER DEFAULT 20,
    discovery_calls_enabled BOOLEAN DEFAULT true,

    -- Session settings
    default_session_duration_minutes INTEGER DEFAULT 60,

    -- Video conferencing
    video_link TEXT,
    video_platform TEXT DEFAULT 'zoom', -- 'zoom', 'google_meet', 'teams', 'other'

    -- Cancellation policy
    cancellation_hours INTEGER DEFAULT 24,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BOOKING PACKAGES
-- =============================================
CREATE TABLE IF NOT EXISTS cs_booking_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parties
    coach_id UUID NOT NULL REFERENCES cs_coaches(id),
    client_id UUID REFERENCES auth.users(id),
    client_email TEXT NOT NULL,
    client_name TEXT,

    -- Package details
    service_id UUID REFERENCES cs_coach_services(id),
    service_name TEXT NOT NULL,
    total_sessions INTEGER NOT NULL,
    sessions_used INTEGER DEFAULT 0,
    session_duration_minutes INTEGER NOT NULL,

    -- Computed column for remaining sessions
    sessions_remaining INTEGER GENERATED ALWAYS AS (total_sessions - sessions_used) STORED,

    -- Payment
    total_price_amount INTEGER NOT NULL, -- In cents
    price_currency TEXT DEFAULT 'eur',
    commission_rate DECIMAL(4,2) DEFAULT 0.15,
    stripe_payment_intent_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),

    -- Validity
    purchased_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Package expiry (e.g., 6 months from purchase)

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'expired', 'refunded')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_coach ON cs_booking_packages(coach_id);
CREATE INDEX IF NOT EXISTS idx_packages_client ON cs_booking_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_packages_email ON cs_booking_packages(client_email);
CREATE INDEX IF NOT EXISTS idx_packages_status ON cs_booking_packages(status);

-- =============================================
-- BOOKINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cs_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parties involved
    coach_id UUID NOT NULL REFERENCES cs_coaches(id),
    client_id UUID REFERENCES auth.users(id), -- NULL for guest bookings

    -- Client info (always stored)
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    client_notes TEXT, -- "What would you like to work on?"

    -- Booking type
    booking_type TEXT NOT NULL CHECK (booking_type IN ('discovery_call', 'single_session', 'package_session')),
    service_id UUID REFERENCES cs_coach_services(id),
    service_name TEXT,

    -- Package tracking
    package_id UUID REFERENCES cs_booking_packages(id),
    package_session_number INTEGER, -- 1, 2, 3, etc.

    -- Schedule
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    timezone TEXT NOT NULL, -- Client's timezone for display

    -- Video conferencing
    video_link TEXT,
    video_platform TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN (
        'pending',      -- Awaiting payment
        'confirmed',    -- Confirmed and scheduled
        'completed',    -- Session happened
        'cancelled',    -- Cancelled by either party
        'no_show',      -- Client didn't show up
        'rescheduled'   -- Was rescheduled to another booking
    )),

    -- Cancellation/reschedule info
    cancelled_at TIMESTAMPTZ,
    cancelled_by TEXT CHECK (cancelled_by IN ('client', 'coach', 'system')),
    cancellation_reason TEXT,
    rescheduled_to_id UUID REFERENCES cs_bookings(id),
    rescheduled_from_id UUID,

    -- Payment info
    payment_status TEXT DEFAULT 'not_required' CHECK (payment_status IN (
        'not_required', -- Discovery calls
        'pending',      -- Awaiting payment
        'paid',         -- Payment successful
        'refunded',     -- Full refund issued
        'partially_refunded'
    )),
    stripe_payment_intent_id TEXT,

    -- Pricing (stored at time of booking)
    price_amount INTEGER, -- In cents
    price_currency TEXT DEFAULT 'eur',
    commission_rate DECIMAL(4,2),
    commission_amount INTEGER, -- In cents
    coach_payout_amount INTEGER, -- In cents

    -- Review tracking
    review_requested_at TIMESTAMPTZ,
    review_id UUID,

    -- Satisfaction guarantee
    refund_eligible BOOLEAN DEFAULT false,
    refund_requested_at TIMESTAMPTZ,
    refund_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_coach ON cs_bookings(coach_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON cs_bookings(client_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_client_email ON cs_bookings(client_email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON cs_bookings(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON cs_bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_payment ON cs_bookings(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package ON cs_bookings(package_id);

-- =============================================
-- STRIPE CONNECT ACCOUNTS
-- =============================================
CREATE TABLE IF NOT EXISTS cs_coach_stripe_accounts (
    coach_id UUID PRIMARY KEY REFERENCES cs_coaches(id) ON DELETE CASCADE,

    -- Stripe Connect account
    stripe_account_id TEXT NOT NULL, -- acct_xxxxx
    account_type TEXT DEFAULT 'express', -- 'express' or 'standard'

    -- Onboarding status
    onboarding_complete BOOLEAN DEFAULT false,
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,

    -- Account details
    country TEXT,
    default_currency TEXT DEFAULT 'eur',

    -- Requirements tracking
    requirements_due JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENT RECORDS
-- =============================================
CREATE TABLE IF NOT EXISTS cs_payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    booking_id UUID REFERENCES cs_bookings(id),
    package_id UUID REFERENCES cs_booking_packages(id),
    coach_id UUID NOT NULL REFERENCES cs_coaches(id),

    -- Stripe IDs
    stripe_payment_intent_id TEXT NOT NULL,
    stripe_charge_id TEXT,
    stripe_transfer_id TEXT,

    -- Amounts (all in cents)
    gross_amount INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    stripe_fee INTEGER,
    net_to_coach INTEGER NOT NULL,
    currency TEXT DEFAULT 'eur',

    -- Status
    status TEXT NOT NULL CHECK (status IN (
        'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'
    )),

    -- Refund tracking
    refund_amount INTEGER DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON cs_payment_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_package ON cs_payment_records(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_coach ON cs_payment_records(coach_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON cs_payment_records(stripe_payment_intent_id);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cs_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,

    -- Content
    type TEXT NOT NULL CHECK (type IN (
        'booking_confirmed',
        'booking_cancelled',
        'booking_rescheduled',
        'booking_reminder_24h',
        'booking_reminder_1h',
        'session_completed',
        'review_request',
        'payment_received',
        'payout_sent',
        'refund_processed',
        'new_booking_coach'
    )),

    -- References
    booking_id UUID REFERENCES cs_bookings(id),
    package_id UUID REFERENCES cs_booking_packages(id),

    -- Delivery
    channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'push')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'opened')),

    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,

    -- Content
    subject TEXT,
    body_preview TEXT,
    template_data JSONB DEFAULT '{}',

    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_pending ON cs_notifications(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_user ON cs_notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_booking ON cs_notifications(booking_id);

-- =============================================
-- TRIGGER: Update package sessions when booking completed
-- =============================================
CREATE OR REPLACE FUNCTION update_package_sessions()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.package_id IS NOT NULL AND OLD.status != 'completed' THEN
        UPDATE cs_booking_packages
        SET sessions_used = sessions_used + 1,
            status = CASE
                WHEN sessions_used + 1 >= total_sessions THEN 'completed'
                ELSE status
            END,
            updated_at = NOW()
        WHERE id = NEW.package_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_package_sessions ON cs_bookings;
CREATE TRIGGER trigger_update_package_sessions
AFTER UPDATE ON cs_bookings
FOR EACH ROW
EXECUTE FUNCTION update_package_sessions();

-- =============================================
-- TRIGGER: Auto-expire packages
-- =============================================
CREATE OR REPLACE FUNCTION check_package_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.status = 'active' THEN
        NEW.status := 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_package_expiry ON cs_booking_packages;
CREATE TRIGGER trigger_check_package_expiry
BEFORE UPDATE ON cs_booking_packages
FOR EACH ROW
EXECUTE FUNCTION check_package_expiry();

-- =============================================
-- TRIGGER: Set refund_eligible for first session
-- =============================================
CREATE OR REPLACE FUNCTION set_refund_eligible()
RETURNS TRIGGER AS $$
DECLARE
    previous_paid_session_count INTEGER;
BEGIN
    -- Only for paid sessions (not discovery calls or package sessions)
    IF NEW.booking_type = 'single_session' AND NEW.payment_status = 'paid' THEN
        -- Count previous completed paid sessions with this coach
        SELECT COUNT(*) INTO previous_paid_session_count
        FROM cs_bookings
        WHERE coach_id = NEW.coach_id
          AND client_email = NEW.client_email
          AND booking_type = 'single_session'
          AND status = 'completed'
          AND id != NEW.id;

        -- First session is eligible for satisfaction guarantee
        NEW.refund_eligible := (previous_paid_session_count = 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_refund_eligible ON cs_bookings;
CREATE TRIGGER trigger_set_refund_eligible
BEFORE INSERT OR UPDATE ON cs_bookings
FOR EACH ROW
EXECUTE FUNCTION set_refund_eligible();

-- =============================================
-- FUNCTION: Get available slots for a coach
-- =============================================
CREATE OR REPLACE FUNCTION get_available_slots(
    p_coach_id UUID,
    p_service_type TEXT,
    p_duration_minutes INTEGER,
    p_start_date DATE,
    p_end_date DATE,
    p_client_timezone TEXT DEFAULT 'Europe/Berlin'
)
RETURNS TABLE (
    slot_date DATE,
    slot_start TIME,
    slot_end TIME,
    slot_start_utc TIMESTAMPTZ,
    is_available BOOLEAN
) AS $$
DECLARE
    v_settings RECORD;
    v_current_date DATE;
    v_day_of_week INTEGER;
    v_slot RECORD;
    v_slot_start TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
    v_has_conflict BOOLEAN;
    v_buffer_before INTERVAL;
    v_buffer_after INTERVAL;
BEGIN
    -- Get coach settings
    SELECT * INTO v_settings
    FROM cs_coach_booking_settings
    WHERE coach_id = p_coach_id;

    IF v_settings IS NULL THEN
        -- Use defaults
        v_settings.timezone := 'Europe/Berlin';
        v_settings.buffer_before_minutes := 15;
        v_settings.buffer_after_minutes := 15;
        v_settings.min_notice_hours := 24;
        v_settings.max_advance_days := 60;
        v_settings.discovery_calls_enabled := true;
    END IF;

    v_buffer_before := (v_settings.buffer_before_minutes || ' minutes')::INTERVAL;
    v_buffer_after := (v_settings.buffer_after_minutes || ' minutes')::INTERVAL;

    -- Iterate through each date
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
        -- Check if date is blocked
        IF NOT EXISTS (
            SELECT 1 FROM cs_coach_blocked_dates
            WHERE coach_id = p_coach_id AND blocked_date = v_current_date
        ) THEN
            v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;

            -- Get availability slots for this day
            FOR v_slot IN
                SELECT ca.start_time, ca.end_time, ca.allows_discovery_calls, ca.allows_sessions
                FROM cs_coach_availability ca
                WHERE ca.coach_id = p_coach_id
                  AND ca.day_of_week = v_day_of_week
                  AND ca.is_active = true
                  AND (
                      (p_service_type = 'discovery_call' AND ca.allows_discovery_calls) OR
                      (p_service_type != 'discovery_call' AND ca.allows_sessions)
                  )
                ORDER BY ca.start_time
            LOOP
                -- Generate time slots within this availability window
                v_slot_start := (v_current_date || ' ' || v_slot.start_time)::TIMESTAMP
                    AT TIME ZONE v_settings.timezone;

                WHILE (v_slot_start + (p_duration_minutes || ' minutes')::INTERVAL)
                    <= ((v_current_date || ' ' || v_slot.end_time)::TIMESTAMP AT TIME ZONE v_settings.timezone)
                LOOP
                    v_slot_end := v_slot_start + (p_duration_minutes || ' minutes')::INTERVAL;

                    -- Check minimum notice
                    IF v_slot_start > (NOW() + (v_settings.min_notice_hours || ' hours')::INTERVAL) THEN
                        -- Check for conflicts with existing bookings
                        SELECT EXISTS (
                            SELECT 1 FROM cs_bookings b
                            WHERE b.coach_id = p_coach_id
                              AND b.status IN ('confirmed', 'pending')
                              AND (
                                  (b.scheduled_at - v_buffer_before, b.scheduled_at + (b.duration_minutes || ' minutes')::INTERVAL + v_buffer_after)
                                  OVERLAPS
                                  (v_slot_start, v_slot_end)
                              )
                        ) INTO v_has_conflict;

                        slot_date := v_current_date;
                        slot_start := (v_slot_start AT TIME ZONE v_settings.timezone)::TIME;
                        slot_end := (v_slot_end AT TIME ZONE v_settings.timezone)::TIME;
                        slot_start_utc := v_slot_start;
                        is_available := NOT v_has_conflict;

                        RETURN NEXT;
                    END IF;

                    -- Move to next slot (30-minute intervals)
                    v_slot_start := v_slot_start + INTERVAL '30 minutes';
                END LOOP;
            END LOOP;
        END IF;

        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Create booking with conflict check
-- =============================================
CREATE OR REPLACE FUNCTION create_booking(
    p_coach_id UUID,
    p_client_id UUID,
    p_client_name TEXT,
    p_client_email TEXT,
    p_client_phone TEXT,
    p_client_notes TEXT,
    p_booking_type TEXT,
    p_service_id UUID,
    p_service_name TEXT,
    p_scheduled_at TIMESTAMPTZ,
    p_duration_minutes INTEGER,
    p_timezone TEXT,
    p_video_link TEXT,
    p_price_amount INTEGER DEFAULT NULL,
    p_commission_rate DECIMAL DEFAULT 0.15,
    p_package_id UUID DEFAULT NULL,
    p_package_session_number INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_booking_id UUID;
    v_settings RECORD;
    v_has_conflict BOOLEAN;
    v_commission_amount INTEGER;
    v_coach_payout INTEGER;
    v_payment_status TEXT;
    v_status TEXT;
BEGIN
    -- Get coach settings
    SELECT * INTO v_settings
    FROM cs_coach_booking_settings
    WHERE coach_id = p_coach_id;

    -- Check for conflicts
    SELECT EXISTS (
        SELECT 1 FROM cs_bookings b
        WHERE b.coach_id = p_coach_id
          AND b.status IN ('confirmed', 'pending')
          AND (
              (b.scheduled_at - INTERVAL '15 minutes', b.scheduled_at + (b.duration_minutes || ' minutes')::INTERVAL + INTERVAL '15 minutes')
              OVERLAPS
              (p_scheduled_at, p_scheduled_at + (p_duration_minutes || ' minutes')::INTERVAL)
          )
    ) INTO v_has_conflict;

    IF v_has_conflict THEN
        RAISE EXCEPTION 'Time slot is no longer available';
    END IF;

    -- Calculate payment amounts
    IF p_price_amount IS NOT NULL AND p_price_amount > 0 THEN
        v_commission_amount := ROUND(p_price_amount * p_commission_rate);
        v_coach_payout := p_price_amount - v_commission_amount;
        v_payment_status := 'pending';
        v_status := 'pending';
    ELSE
        v_commission_amount := NULL;
        v_coach_payout := NULL;
        v_payment_status := 'not_required';
        v_status := 'confirmed';
    END IF;

    -- Create the booking
    INSERT INTO cs_bookings (
        coach_id, client_id, client_name, client_email, client_phone, client_notes,
        booking_type, service_id, service_name,
        package_id, package_session_number,
        scheduled_at, duration_minutes, timezone,
        video_link, video_platform,
        status, payment_status,
        price_amount, price_currency, commission_rate, commission_amount, coach_payout_amount
    ) VALUES (
        p_coach_id, p_client_id, p_client_name, p_client_email, p_client_phone, p_client_notes,
        p_booking_type, p_service_id, p_service_name,
        p_package_id, p_package_session_number,
        p_scheduled_at, p_duration_minutes, p_timezone,
        COALESCE(p_video_link, v_settings.video_link), COALESCE(v_settings.video_platform, 'zoom'),
        v_status, v_payment_status,
        p_price_amount, 'eur', p_commission_rate, v_commission_amount, v_coach_payout
    ) RETURNING id INTO v_booking_id;

    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Coach availability: coaches can manage their own
ALTER TABLE cs_coach_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own availability" ON cs_coach_availability
    FOR ALL USING (coach_id IN (SELECT id FROM cs_coaches WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active availability" ON cs_coach_availability
    FOR SELECT USING (is_active = true);

-- Blocked dates: coaches can manage their own
ALTER TABLE cs_coach_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own blocked dates" ON cs_coach_blocked_dates
    FOR ALL USING (coach_id IN (SELECT id FROM cs_coaches WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view blocked dates" ON cs_coach_blocked_dates
    FOR SELECT USING (true);

-- Booking settings: coaches can manage their own
ALTER TABLE cs_coach_booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own settings" ON cs_coach_booking_settings
    FOR ALL USING (coach_id IN (SELECT id FROM cs_coaches WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view booking settings" ON cs_coach_booking_settings
    FOR SELECT USING (true);

-- Bookings: coaches and clients can view their own
ALTER TABLE cs_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own bookings" ON cs_bookings
    FOR SELECT USING (coach_id IN (SELECT id FROM cs_coaches WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view own bookings" ON cs_bookings
    FOR SELECT USING (client_id = auth.uid() OR client_email = current_setting('app.user_email', true));

CREATE POLICY "Anyone can create bookings" ON cs_bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Coaches can update own bookings" ON cs_bookings
    FOR UPDATE USING (coach_id IN (SELECT id FROM cs_coaches WHERE user_id = auth.uid()));

-- Packages
ALTER TABLE cs_booking_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own packages" ON cs_booking_packages
    FOR SELECT USING (coach_id IN (SELECT id FROM cs_coaches WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view own packages" ON cs_booking_packages
    FOR SELECT USING (client_id = auth.uid() OR client_email = current_setting('app.user_email', true));

-- Stripe accounts: coaches can view their own
ALTER TABLE cs_coach_stripe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own Stripe account" ON cs_coach_stripe_accounts
    FOR SELECT USING (coach_id IN (SELECT id FROM cs_coaches WHERE user_id = auth.uid()));

-- Payment records: coaches can view their own
ALTER TABLE cs_payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own payments" ON cs_payment_records
    FOR SELECT USING (coach_id IN (SELECT id FROM cs_coaches WHERE user_id = auth.uid()));

-- Notifications
ALTER TABLE cs_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON cs_notifications
    FOR SELECT USING (user_id = auth.uid() OR email = current_setting('app.user_email', true));

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE cs_coach_availability IS 'Weekly recurring availability slots for coaches';
COMMENT ON TABLE cs_coach_blocked_dates IS 'Specific dates when coach is unavailable';
COMMENT ON TABLE cs_coach_booking_settings IS 'Coach preferences for booking behavior';
COMMENT ON TABLE cs_bookings IS 'All coaching session bookings';
COMMENT ON TABLE cs_booking_packages IS 'Multi-session packages purchased by clients';
COMMENT ON TABLE cs_coach_stripe_accounts IS 'Stripe Connect accounts for coaches';
COMMENT ON TABLE cs_payment_records IS 'Payment transaction history';
COMMENT ON TABLE cs_notifications IS 'Email and notification queue';
COMMENT ON FUNCTION get_available_slots IS 'Returns available booking slots for a coach';
COMMENT ON FUNCTION create_booking IS 'Creates a booking with conflict checking';
