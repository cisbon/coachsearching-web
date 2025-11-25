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

-- Bookings (Paid and Pro-bono)
CREATE TABLE public.cs_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id),
    client_id UUID REFERENCES auth.users(id),
    package_id UUID REFERENCES public.cs_packages(id),
    slot_id UUID, -- Optional link to pro_bono_slots if applicable
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    type TEXT DEFAULT 'paid' CHECK (type IN ('paid', 'pro_bono')),
    amount DECIMAL(10, 2),
    currency TEXT,
    stripe_payment_intent_id TEXT,
    meeting_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
ALTER TABLE public.cs_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_reviews ENABLE ROW LEVEL SECURITY;

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

-- Bookings: Viewable by involved parties
CREATE POLICY "View own bookings" ON public.cs_bookings FOR SELECT USING (
    (select auth.uid()) = client_id OR (select auth.uid()) = coach_id
);
CREATE POLICY "Clients can insert bookings" ON public.cs_bookings FOR INSERT WITH CHECK ((select auth.uid()) = client_id);
CREATE POLICY "Coaches can update bookings" ON public.cs_bookings FOR UPDATE USING ((select auth.uid()) = coach_id);

-- Reviews: Public read published reviews, clients can write
CREATE POLICY "Reviews are viewable by everyone" ON public.cs_reviews FOR SELECT USING (true);
CREATE POLICY "Clients can insert own reviews" ON public.cs_reviews FOR INSERT WITH CHECK ((select auth.uid()) = client_id);
CREATE POLICY "Clients can update own reviews" ON public.cs_reviews FOR UPDATE USING ((select auth.uid()) = client_id);
CREATE POLICY "Clients can delete own reviews" ON public.cs_reviews FOR DELETE USING ((select auth.uid()) = client_id);

-- Permissions for View and RPC
GRANT SELECT ON public.cs_user_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_booking_by_intent TO anon, authenticated;

