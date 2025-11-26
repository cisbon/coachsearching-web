-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Types and Profiles
-- Store user type in auth.users metadata during signup: { user_type: 'coach' | 'client' | 'business' }

-- Feature Flags
CREATE TABLE IF NOT EXISTS cs_feature_flags (
    name TEXT PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE
);

INSERT INTO cs_feature_flags (name, enabled) VALUES
('article_editor', true),
('pro_bono', true),
('group_sessions', false)
ON CONFLICT (name) DO NOTHING;

-- Coaches (Profile data)
CREATE TABLE public.cs_coaches (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    title TEXT NOT NULL,
    bio TEXT,
    location TEXT,
    hourly_rate DECIMAL(10, 2),
    currency TEXT DEFAULT 'EUR',
    stripe_account_id TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    certified_hours DECIMAL(10, 2) DEFAULT 0,
    languages TEXT[], -- Array of languages spoken (e.g., ['en', 'de', 'es'])
    specialties TEXT[], -- Array of specialties (e.g., ['Life Coaching', 'Business Coaching'])
    session_types TEXT[], -- Array of session types (e.g., ['online', 'onsite'])
    availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable')),
    rating_average DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Profiles
CREATE TABLE public.cs_businesses (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    company_name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    industry TEXT,
    company_size TEXT, -- 'small', 'medium', 'large', 'enterprise'
    location TEXT,
    website TEXT,
    contact_name TEXT,
    contact_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Profiles (minimal, most data in auth.users metadata)
CREATE TABLE public.cs_clients (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB, -- Store preferences like preferred languages, coaching areas, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Articles
CREATE TABLE public.cs_articles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL, -- HTML content
    summary TEXT,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pro Bono Slots
CREATE TABLE public.cs_pro_bono_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Packages
CREATE TABLE public.cs_packages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id),
    name TEXT NOT NULL,
    description TEXT,
    session_count INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coach Availability (Weekly Recurring Schedule)
CREATE TABLE public.cs_coach_availability (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, day_of_week, start_time) -- Prevent duplicate time slots
);

-- Coach Availability Overrides (Specific Date Exceptions)
CREATE TABLE public.cs_coach_availability_overrides (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_available BOOLEAN NOT NULL, -- true = add available time, false = block time
    start_time TIME,
    end_time TIME,
    reason TEXT, -- e.g., "Vacation", "Conference", "Special availability"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, date, start_time)
);

-- Bookings (Paid and Pro-bono)
CREATE TABLE public.cs_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id),
    client_id UUID REFERENCES auth.users(id),
    package_id UUID REFERENCES public.cs_packages(id),
    slot_id UUID, -- Optional link to pro_bono_slots if applicable
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    type TEXT DEFAULT 'paid' CHECK (type IN ('paid', 'pro_bono')),
    meeting_type TEXT DEFAULT 'online' CHECK (meeting_type IN ('online', 'onsite')),
    meeting_link TEXT,
    meeting_location TEXT, -- Physical address for onsite sessions
    amount DECIMAL(10, 2),
    currency TEXT DEFAULT 'EUR',
    platform_fee DECIMAL(10, 2), -- 10% platform fee
    coach_payout DECIMAL(10, 2), -- Amount coach receives
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT,
    client_notes TEXT, -- Notes from client about session
    coach_notes TEXT, -- Private notes from coach
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES auth.users(id),
    cancellation_reason TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews
CREATE TABLE public.cs_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id),
    client_id UUID REFERENCES auth.users(id),
    booking_id UUID REFERENCES public.cs_bookings(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(booking_id) -- One review per booking
);

-- Notifications (In-app and Email)
CREATE TABLE public.cs_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'booking_confirmed', 'booking_cancelled', 'session_reminder', 'review_received', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data (booking_id, coach_id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VIEW for User Profiles (Exposing auth.users metadata to REST API)
CREATE OR REPLACE VIEW public.cs_user_profiles AS
SELECT
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    raw_user_meta_data->>'user_type' as user_type
FROM auth.users;

-- Function to update coach rating after review
CREATE OR REPLACE FUNCTION update_coach_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cs_coaches
    SET
        rating_average = (SELECT AVG(rating)::DECIMAL(3,2) FROM cs_reviews WHERE coach_id = NEW.coach_id),
        rating_count = (SELECT COUNT(*) FROM cs_reviews WHERE coach_id = NEW.coach_id)
    WHERE id = NEW.coach_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_rating_trigger
AFTER INSERT OR UPDATE ON cs_reviews
FOR EACH ROW
EXECUTE FUNCTION update_coach_rating();

-- RPC for Webhook Updates (Security Definer to allow Anon updates)
CREATE OR REPLACE FUNCTION confirm_booking_by_intent(intent_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE cs_bookings SET status = 'confirmed' WHERE stripe_payment_intent_id = intent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.cs_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_pro_bono_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coach_availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_notifications ENABLE ROW LEVEL SECURITY;

-- Feature Flags: Public read
CREATE POLICY "Feature flags are viewable by everyone" ON public.cs_feature_flags FOR SELECT USING (true);

-- Coaches: Public read, update own, insert own
CREATE POLICY "Coaches are viewable by everyone" ON public.cs_coaches FOR SELECT USING (true);
CREATE POLICY "Coaches can insert own profile" ON public.cs_coaches FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Coaches can update own profile" ON public.cs_coaches FOR UPDATE USING ((select auth.uid()) = id);

-- Businesses: Public read, update own, insert own
CREATE POLICY "Businesses are viewable by everyone" ON public.cs_businesses FOR SELECT USING (true);
CREATE POLICY "Businesses can insert own profile" ON public.cs_businesses FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Businesses can update own profile" ON public.cs_businesses FOR UPDATE USING ((select auth.uid()) = id);

-- Clients: Users can view and update own profile
CREATE POLICY "Clients can view own profile" ON public.cs_clients FOR SELECT USING ((select auth.uid()) = id);
CREATE POLICY "Clients can insert own profile" ON public.cs_clients FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Clients can update own profile" ON public.cs_clients FOR UPDATE USING ((select auth.uid()) = id);

-- Packages: Public read, coach manage
CREATE POLICY "Packages are viewable by everyone" ON public.cs_packages FOR SELECT USING (true);
CREATE POLICY "Coaches can insert own packages" ON public.cs_packages FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can update own packages" ON public.cs_packages FOR UPDATE USING ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can delete own packages" ON public.cs_packages FOR DELETE USING ((select auth.uid()) = coach_id);

-- Articles: Published are public, drafts viewable by author
CREATE POLICY "Articles viewable by everyone or author" ON public.cs_articles FOR SELECT USING (
    published = true OR (select auth.uid()) = coach_id
);
CREATE POLICY "Authors can insert own articles" ON public.cs_articles FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Authors can update own articles" ON public.cs_articles FOR UPDATE USING ((select auth.uid()) = coach_id);

-- Pro Bono Slots: Public read, coach manage
CREATE POLICY "Slots viewable by everyone" ON public.cs_pro_bono_slots FOR SELECT USING (true);
CREATE POLICY "Coaches can insert own slots" ON public.cs_pro_bono_slots FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can update own slots" ON public.cs_pro_bono_slots FOR UPDATE USING ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can delete own slots" ON public.cs_pro_bono_slots FOR DELETE USING ((select auth.uid()) = coach_id);

-- Coach Availability: Public read for scheduling, coach manage
CREATE POLICY "Availability viewable by everyone" ON public.cs_coach_availability FOR SELECT USING (true);
CREATE POLICY "Coaches can insert own availability" ON public.cs_coach_availability FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can update own availability" ON public.cs_coach_availability FOR UPDATE USING ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can delete own availability" ON public.cs_coach_availability FOR DELETE USING ((select auth.uid()) = coach_id);

-- Coach Availability Overrides: Public read, coach manage
CREATE POLICY "Availability overrides viewable by everyone" ON public.cs_coach_availability_overrides FOR SELECT USING (true);
CREATE POLICY "Coaches can insert own overrides" ON public.cs_coach_availability_overrides FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can update own overrides" ON public.cs_coach_availability_overrides FOR UPDATE USING ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can delete own overrides" ON public.cs_coach_availability_overrides FOR DELETE USING ((select auth.uid()) = coach_id);

-- Bookings: Viewable by involved parties
CREATE POLICY "View own bookings" ON public.cs_bookings FOR SELECT USING (
    (select auth.uid()) = client_id OR (select auth.uid()) = coach_id
);
CREATE POLICY "Clients can insert bookings" ON public.cs_bookings FOR INSERT WITH CHECK ((select auth.uid()) = client_id);
CREATE POLICY "Involved parties can update bookings" ON public.cs_bookings FOR UPDATE USING (
    (select auth.uid()) = coach_id OR (select auth.uid()) = client_id
);

-- Notifications: Users can view and update their own
CREATE POLICY "Users can view own notifications" ON public.cs_notifications FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own notifications" ON public.cs_notifications FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "System can insert notifications" ON public.cs_notifications FOR INSERT WITH CHECK (true); -- Allow system to create notifications

-- Reviews: Public read published reviews, clients can write
CREATE POLICY "Reviews are viewable by everyone" ON public.cs_reviews FOR SELECT USING (true);
CREATE POLICY "Clients can insert own reviews" ON public.cs_reviews FOR INSERT WITH CHECK ((select auth.uid()) = client_id);
CREATE POLICY "Clients can update own reviews" ON public.cs_reviews FOR UPDATE USING ((select auth.uid()) = client_id);
CREATE POLICY "Clients can delete own reviews" ON public.cs_reviews FOR DELETE USING ((select auth.uid()) = client_id);

-- Indexes for Performance
CREATE INDEX idx_coach_availability_coach_day ON public.cs_coach_availability(coach_id, day_of_week);
CREATE INDEX idx_coach_overrides_coach_date ON public.cs_coach_availability_overrides(coach_id, date);
CREATE INDEX idx_bookings_coach_time ON public.cs_bookings(coach_id, start_time, status);
CREATE INDEX idx_bookings_client ON public.cs_bookings(client_id, status);
CREATE INDEX idx_bookings_payment_intent ON public.cs_bookings(stripe_payment_intent_id);
CREATE INDEX idx_notifications_user_read ON public.cs_notifications(user_id, is_read);
CREATE INDEX idx_reviews_coach ON public.cs_reviews(coach_id);

-- Permissions for View and RPC
GRANT SELECT ON public.cs_user_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_booking_by_intent TO anon, authenticated;

