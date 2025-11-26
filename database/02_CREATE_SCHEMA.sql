-- =====================================================
-- STEP 2: CREATE CLEAN SCHEMA WITH cs_ PREFIX
-- CoachSearching.com - Minimal MVP Schema
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- Extends auth.users with additional profile data
-- =====================================================

CREATE TABLE public.cs_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    user_type TEXT DEFAULT 'client', -- 'client', 'coach', 'business'

    -- Settings
    language_preference TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'EUR',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    onboarding_completed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ
);

-- =====================================================
-- COACHES TABLE
-- Coach profiles and professional information
-- =====================================================

CREATE TABLE public.cs_coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.cs_users(id) ON DELETE CASCADE,

    -- Profile Information
    full_name TEXT,
    title TEXT, -- e.g., "Certified Life Coach"
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,

    -- Location
    location TEXT,

    -- Professional Details
    specialties TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{}',

    -- Service Options
    session_types TEXT[] DEFAULT '{}', -- ['online', 'onsite']

    -- Pricing
    hourly_rate DECIMAL(10,2),
    currency TEXT DEFAULT 'EUR',

    -- Statistics
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,

    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_cs_users_email ON public.cs_users(email);
CREATE INDEX idx_cs_users_user_type ON public.cs_users(user_type);

-- Coaches indexes
CREATE INDEX idx_cs_coaches_user_id ON public.cs_coaches(user_id);
CREATE INDEX idx_cs_coaches_location ON public.cs_coaches(location);
CREATE INDEX idx_cs_coaches_specialties ON public.cs_coaches USING GIN(specialties);
CREATE INDEX idx_cs_coaches_rating ON public.cs_coaches(rating_average DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cs_users_updated_at
    BEFORE UPDATE ON public.cs_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_coaches_updated_at
    BEFORE UPDATE ON public.cs_coaches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.cs_users (id, email, full_name, user_type)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'user_type', 'client')
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

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.cs_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coaches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- cs_users POLICIES
-- =====================================================

-- Anyone can view basic user info
DROP POLICY IF EXISTS "Anyone can view users" ON public.cs_users;
CREATE POLICY "Anyone can view users"
    ON public.cs_users FOR SELECT
    USING (TRUE);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.cs_users;
CREATE POLICY "Users can insert own profile"
    ON public.cs_users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.cs_users;
CREATE POLICY "Users can update own profile"
    ON public.cs_users FOR UPDATE
    USING (auth.uid() = id);

-- =====================================================
-- cs_coaches POLICIES
-- =====================================================

-- Anyone can view coach profiles
DROP POLICY IF EXISTS "Anyone can view coaches" ON public.cs_coaches;
CREATE POLICY "Anyone can view coaches"
    ON public.cs_coaches FOR SELECT
    USING (TRUE);

-- Coaches can insert their own profile
DROP POLICY IF EXISTS "Coaches can insert own profile" ON public.cs_coaches;
CREATE POLICY "Coaches can insert own profile"
    ON public.cs_coaches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Coaches can update their own profile
DROP POLICY IF EXISTS "Coaches can update own profile" ON public.cs_coaches;
CREATE POLICY "Coaches can update own profile"
    ON public.cs_coaches FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- BACKFILL EXISTING AUTH USERS
-- =====================================================

-- Insert existing auth users into cs_users
INSERT INTO public.cs_users (id, email, full_name, user_type, created_at)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    COALESCE(au.raw_user_meta_data->>'user_type', 'client'),
    au.created_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.cs_users cu WHERE cu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_coaches TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Your database is now set up with the cs_ prefix.
-- All tables: cs_users, cs_coaches
-- Refresh your app and try saving your profile!
-- =====================================================
