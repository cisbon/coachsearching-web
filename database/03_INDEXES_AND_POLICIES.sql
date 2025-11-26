-- =====================================================
-- STEP 3: INDEXES, FUNCTIONS, TRIGGERS & RLS POLICIES
-- Run this after 02_CREATE_SCHEMA.sql
-- =====================================================

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_cs_users_email ON public.cs_users(email);
CREATE INDEX idx_cs_users_role ON public.cs_users(role);
CREATE INDEX idx_cs_users_user_type ON public.cs_users(user_type);
CREATE INDEX idx_cs_users_referral_code ON public.cs_users(referral_code);

-- Coaches indexes
CREATE INDEX idx_cs_coaches_user_id ON public.cs_coaches(user_id);
CREATE INDEX idx_cs_coaches_slug ON public.cs_coaches(slug);
CREATE INDEX idx_cs_coaches_is_verified ON public.cs_coaches(is_verified);
CREATE INDEX idx_cs_coaches_specialties ON public.cs_coaches USING GIN(specialties);
CREATE INDEX idx_cs_coaches_location ON public.cs_coaches(location);
CREATE INDEX idx_cs_coaches_rating ON public.cs_coaches(rating_average DESC);

-- Availability indexes
CREATE INDEX idx_cs_coach_availability_coach_day ON public.cs_coach_availability(coach_id, day_of_week);
CREATE INDEX idx_cs_coach_availability_overrides_coach_date ON public.cs_coach_availability_overrides(coach_id, date);

-- Bookings indexes
CREATE INDEX idx_cs_bookings_client ON public.cs_bookings(client_id);
CREATE INDEX idx_cs_bookings_coach ON public.cs_bookings(coach_id);
CREATE INDEX idx_cs_bookings_scheduled_at ON public.cs_bookings(scheduled_at);
CREATE INDEX idx_cs_bookings_status ON public.cs_bookings(status);

-- Reviews indexes
CREATE INDEX idx_cs_reviews_coach ON public.cs_reviews(coach_id);
CREATE INDEX idx_cs_reviews_rating ON public.cs_reviews(rating);
CREATE INDEX idx_cs_reviews_is_published ON public.cs_reviews(is_published);

-- Articles indexes
CREATE INDEX idx_cs_articles_coach ON public.cs_articles(coach_id);
CREATE INDEX idx_cs_articles_slug ON public.cs_articles(slug);
CREATE INDEX idx_cs_articles_status ON public.cs_articles(status);

-- Messages indexes
CREATE INDEX idx_cs_messages_conversation ON public.cs_messages(conversation_id);
CREATE INDEX idx_cs_messages_sender ON public.cs_messages(sender_id);
CREATE INDEX idx_cs_messages_recipient ON public.cs_messages(recipient_id);

-- Notifications indexes
CREATE INDEX idx_cs_notifications_user ON public.cs_notifications(user_id);
CREATE INDEX idx_cs_notifications_is_read ON public.cs_notifications(is_read);

-- Favorites indexes
CREATE INDEX idx_cs_favorites_client ON public.cs_favorites(client_id);
CREATE INDEX idx_cs_favorites_coach ON public.cs_favorites(coach_id);

-- Coach Views indexes
CREATE INDEX idx_cs_coach_views_coach ON public.cs_coach_views(coach_id);
CREATE INDEX idx_cs_coach_views_viewer ON public.cs_coach_views(viewer_id);
CREATE INDEX idx_cs_coach_views_viewed_at ON public.cs_coach_views(viewed_at DESC);

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
CREATE TRIGGER update_cs_users_updated_at BEFORE UPDATE ON public.cs_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_coaches_updated_at BEFORE UPDATE ON public.cs_coaches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_bookings_updated_at BEFORE UPDATE ON public.cs_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_reviews_updated_at BEFORE UPDATE ON public.cs_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_articles_updated_at BEFORE UPDATE ON public.cs_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_coach_availability_updated_at BEFORE UPDATE ON public.cs_coach_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_services_updated_at BEFORE UPDATE ON public.cs_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_pro_bono_bookings_updated_at BEFORE UPDATE ON public.cs_pro_bono_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_feature_flags_updated_at BEFORE UPDATE ON public.cs_feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.cs_users (id, email, full_name, user_type, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'user_type', 'client'),
        COALESCE((NEW.raw_user_meta_data->>'user_type')::cs_user_role, 'client')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Update coach statistics when review is added
CREATE OR REPLACE FUNCTION update_coach_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.cs_coaches
    SET
        total_reviews = (
            SELECT COUNT(*)
            FROM public.cs_reviews
            WHERE coach_id = NEW.coach_id AND is_published = TRUE
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM public.cs_reviews
            WHERE coach_id = NEW.coach_id AND is_published = TRUE
        ),
        rating_average = (
            SELECT AVG(rating)::DECIMAL(3,2)
            FROM public.cs_reviews
            WHERE coach_id = NEW.coach_id AND is_published = TRUE
        )
    WHERE id = NEW.coach_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_stats_on_review
    AFTER INSERT OR UPDATE ON public.cs_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_review_stats();

-- Update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.cs_conversations
    SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100)
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON public.cs_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Mark pro bono slot as booked
CREATE OR REPLACE FUNCTION mark_pro_bono_slot_booked()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.cs_pro_bono_slots
    SET is_booked = TRUE
    WHERE id = NEW.slot_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_slot_booked_on_booking
    AFTER INSERT ON public.cs_pro_bono_bookings
    FOR EACH ROW
    EXECUTE FUNCTION mark_pro_bono_slot_booked();

-- Generate invoice number
CREATE SEQUENCE IF NOT EXISTS cs_invoice_number_seq;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('cs_invoice_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON public.cs_invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL)
    EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.cs_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coach_availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_pro_bono_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_pro_bono_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coach_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- cs_users POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view users" ON public.cs_users;
CREATE POLICY "Anyone can view users"
    ON public.cs_users FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.cs_users;
CREATE POLICY "Users can insert own profile"
    ON public.cs_users FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.cs_users;
CREATE POLICY "Users can update own profile"
    ON public.cs_users FOR UPDATE
    USING (auth.uid() = id);

-- =====================================================
-- cs_coaches POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view coaches" ON public.cs_coaches;
CREATE POLICY "Anyone can view coaches"
    ON public.cs_coaches FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Coaches can insert own profile" ON public.cs_coaches;
CREATE POLICY "Coaches can insert own profile"
    ON public.cs_coaches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coaches can update own profile" ON public.cs_coaches;
CREATE POLICY "Coaches can update own profile"
    ON public.cs_coaches FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- AVAILABILITY POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view availability" ON public.cs_coach_availability;
CREATE POLICY "Anyone can view availability"
    ON public.cs_coach_availability FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Coaches can manage own availability" ON public.cs_coach_availability;
CREATE POLICY "Coaches can manage own availability"
    ON public.cs_coach_availability FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can view availability overrides" ON public.cs_coach_availability_overrides;
CREATE POLICY "Anyone can view availability overrides"
    ON public.cs_coach_availability_overrides FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Coaches can manage own overrides" ON public.cs_coach_availability_overrides;
CREATE POLICY "Coaches can manage own overrides"
    ON public.cs_coach_availability_overrides FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- SERVICES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view services" ON public.cs_services;
CREATE POLICY "Anyone can view services"
    ON public.cs_services FOR SELECT
    USING (is_active = TRUE OR EXISTS (
        SELECT 1 FROM public.cs_coaches
        WHERE id = coach_id AND user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Coaches can manage own services" ON public.cs_services;
CREATE POLICY "Coaches can manage own services"
    ON public.cs_services FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- BOOKINGS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own bookings" ON public.cs_bookings;
CREATE POLICY "Users can view own bookings"
    ON public.cs_bookings FOR SELECT
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Clients can create bookings" ON public.cs_bookings;
CREATE POLICY "Clients can create bookings"
    ON public.cs_bookings FOR INSERT
    WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Participants can update bookings" ON public.cs_bookings;
CREATE POLICY "Participants can update bookings"
    ON public.cs_bookings FOR UPDATE
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- REVIEWS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.cs_reviews;
CREATE POLICY "Anyone can view published reviews"
    ON public.cs_reviews FOR SELECT
    USING (is_published = TRUE OR client_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.cs_coaches
        WHERE id = coach_id AND user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Clients can create reviews" ON public.cs_reviews;
CREATE POLICY "Clients can create reviews"
    ON public.cs_reviews FOR INSERT
    WITH CHECK (
        client_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.cs_bookings
            WHERE id = booking_id AND status = 'completed'
        )
    );

DROP POLICY IF EXISTS "Coaches can respond to reviews" ON public.cs_reviews;
CREATE POLICY "Coaches can respond to reviews"
    ON public.cs_reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- ARTICLES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view published articles" ON public.cs_articles;
CREATE POLICY "Anyone can view published articles"
    ON public.cs_articles FOR SELECT
    USING (status = 'published' OR EXISTS (
        SELECT 1 FROM public.cs_coaches
        WHERE id = coach_id AND user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Coaches can manage own articles" ON public.cs_articles;
CREATE POLICY "Coaches can manage own articles"
    ON public.cs_articles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- PRO BONO POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view pro bono slots" ON public.cs_pro_bono_slots;
CREATE POLICY "Anyone can view pro bono slots"
    ON public.cs_pro_bono_slots FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Coaches can manage own pro bono slots" ON public.cs_pro_bono_slots;
CREATE POLICY "Coaches can manage own pro bono slots"
    ON public.cs_pro_bono_slots FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own pro bono bookings" ON public.cs_pro_bono_bookings;
CREATE POLICY "Users can view own pro bono bookings"
    ON public.cs_pro_bono_bookings FOR SELECT
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.cs_pro_bono_slots ps
            JOIN public.cs_coaches c ON c.id = ps.coach_id
            WHERE ps.id = slot_id AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Clients can book pro bono slots" ON public.cs_pro_bono_bookings;
CREATE POLICY "Clients can book pro bono slots"
    ON public.cs_pro_bono_bookings FOR INSERT
    WITH CHECK (client_id = auth.uid());

-- =====================================================
-- MESSAGING POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own conversations" ON public.cs_conversations;
CREATE POLICY "Users can view own conversations"
    ON public.cs_conversations FOR SELECT
    USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

DROP POLICY IF EXISTS "Users can create conversations" ON public.cs_conversations;
CREATE POLICY "Users can create conversations"
    ON public.cs_conversations FOR INSERT
    WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own messages" ON public.cs_messages;
CREATE POLICY "Users can view own messages"
    ON public.cs_messages FOR SELECT
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can send messages" ON public.cs_messages;
CREATE POLICY "Users can send messages"
    ON public.cs_messages FOR INSERT
    WITH CHECK (sender_id = auth.uid());

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON public.cs_notifications;
CREATE POLICY "Users can view own notifications"
    ON public.cs_notifications FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.cs_notifications;
CREATE POLICY "Users can update own notifications"
    ON public.cs_notifications FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- FAVORITES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own favorites" ON public.cs_favorites;
CREATE POLICY "Users can manage own favorites"
    ON public.cs_favorites FOR ALL
    USING (client_id = auth.uid());

-- =====================================================
-- COACH VIEWS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can create coach views" ON public.cs_coach_views;
CREATE POLICY "Anyone can create coach views"
    ON public.cs_coach_views FOR INSERT
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Coaches can view own profile views" ON public.cs_coach_views;
CREATE POLICY "Coaches can view own profile views"
    ON public.cs_coach_views FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- FINANCIAL POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own invoices" ON public.cs_invoices;
CREATE POLICY "Users can view own invoices"
    ON public.cs_invoices FOR SELECT
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Coaches can view own payouts" ON public.cs_payouts;
CREATE POLICY "Coaches can view own payouts"
    ON public.cs_payouts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE id = coach_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own refunds" ON public.cs_refunds;
CREATE POLICY "Users can view own refunds"
    ON public.cs_refunds FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_bookings b
            WHERE b.id = booking_id AND (
                b.client_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.cs_coaches c
                    WHERE c.id = b.coach_id AND c.user_id = auth.uid()
                )
            )
        )
    );

-- =====================================================
-- PROMO CODES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view promo codes" ON public.cs_promo_codes;
CREATE POLICY "Anyone can view promo codes"
    ON public.cs_promo_codes FOR SELECT
    USING (is_active = TRUE);

-- =====================================================
-- REFERRALS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own referrals" ON public.cs_referrals;
CREATE POLICY "Users can view own referrals"
    ON public.cs_referrals FOR SELECT
    USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create referrals" ON public.cs_referrals;
CREATE POLICY "Users can create referrals"
    ON public.cs_referrals FOR INSERT
    WITH CHECK (referrer_id = auth.uid());

-- =====================================================
-- LEGAL POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own data export requests" ON public.cs_data_export_requests;
CREATE POLICY "Users can view own data export requests"
    ON public.cs_data_export_requests FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create data export requests" ON public.cs_data_export_requests;
CREATE POLICY "Users can create data export requests"
    ON public.cs_data_export_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.cs_account_deletion_requests;
CREATE POLICY "Users can view own deletion requests"
    ON public.cs_account_deletion_requests FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create deletion requests" ON public.cs_account_deletion_requests;
CREATE POLICY "Users can create deletion requests"
    ON public.cs_account_deletion_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- REPORTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own reports" ON public.cs_reports;
CREATE POLICY "Users can view own reports"
    ON public.cs_reports FOR SELECT
    USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can create reports" ON public.cs_reports;
CREATE POLICY "Users can create reports"
    ON public.cs_reports FOR INSERT
    WITH CHECK (reporter_id = auth.uid());

-- =====================================================
-- BACKFILL EXISTING AUTH USERS
-- =====================================================

INSERT INTO public.cs_users (id, email, full_name, user_type, role, created_at)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    COALESCE(au.raw_user_meta_data->>'user_type', 'client'),
    COALESCE((au.raw_user_meta_data->>'user_type')::cs_user_role, 'client'),
    au.created_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.cs_users cu WHERE cu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- INITIAL DATA
-- =====================================================

INSERT INTO public.cs_feature_flags (name, description, enabled) VALUES
    ('booking_system', 'Enable booking system', TRUE),
    ('messaging', 'Enable in-app messaging', TRUE),
    ('pro_bono', 'Enable pro bono slots', TRUE),
    ('articles', 'Enable coach articles', TRUE),
    ('reviews', 'Enable review system', TRUE),
    ('referrals', 'Enable referral program', FALSE),
    ('promo_codes', 'Enable promo codes', TRUE)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Database setup complete with all tables, indexes,
-- functions, triggers, and RLS policies.
--
-- Total tables created: 30+
-- All with cs_ prefix
--
-- Ready to use!
-- =====================================================
