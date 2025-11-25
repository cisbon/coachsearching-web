-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    title TEXT,
    bio TEXT,
    hourly_rate DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',
    stripe_account_id TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    certified_hours DECIMAL(10, 2) DEFAULT 0,
    languages TEXT[], -- Array of languages spoken
    specialties TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Bookings (Paid and Pro-bono)
CREATE TABLE public.cs_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id),
    client_id UUID REFERENCES auth.users(id),
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

-- RLS Policies
ALTER TABLE public.cs_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_pro_bono_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_bookings ENABLE ROW LEVEL SECURITY;

-- Feature Flags: Public read, Admin write (assuming admin role check or similar, for now read-only public)
CREATE POLICY "Feature flags are viewable by everyone" ON public.cs_feature_flags FOR SELECT USING (true);

-- Coaches: Public read, update own
-- Fix: Use (select auth.uid()) to avoid re-evaluation
CREATE POLICY "Coaches are viewable by everyone" ON public.cs_coaches FOR SELECT USING (true);
CREATE POLICY "Coaches can update own profile" ON public.cs_coaches FOR UPDATE USING ((select auth.uid()) = id);

-- Articles: Published are public, drafts viewable by author
-- Fix: Combine policies to avoid "Multiple Permissive Policies" warning where possible, or accept if logic requires split.
-- However, for SELECT, we can combine: (published = true) OR (auth.uid() = coach_id)
CREATE POLICY "Articles viewable by everyone or author" ON public.cs_articles FOR SELECT USING (
    published = true OR (select auth.uid()) = coach_id
);
CREATE POLICY "Authors can insert own articles" ON public.cs_articles FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Authors can update own articles" ON public.cs_articles FOR UPDATE USING ((select auth.uid()) = coach_id);

-- Pro Bono Slots: Public read, coach manage
-- Fix: Combine SELECT policies
CREATE POLICY "Slots viewable by everyone" ON public.cs_pro_bono_slots FOR SELECT USING (true);
-- Separate policies for modification
CREATE POLICY "Coaches can insert own slots" ON public.cs_pro_bono_slots FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can update own slots" ON public.cs_pro_bono_slots FOR UPDATE USING ((select auth.uid()) = coach_id);
CREATE POLICY "Coaches can delete own slots" ON public.cs_pro_bono_slots FOR DELETE USING ((select auth.uid()) = coach_id);

-- Bookings: Viewable by involved parties
CREATE POLICY "View own bookings" ON public.cs_bookings FOR SELECT USING (
    (select auth.uid()) = client_id OR (select auth.uid()) = coach_id
);
CREATE POLICY "Clients can insert bookings" ON public.cs_bookings FOR INSERT WITH CHECK ((select auth.uid()) = client_id);
CREATE POLICY "Coaches can update bookings" ON public.cs_bookings FOR UPDATE USING ((select auth.uid()) = coach_id);
