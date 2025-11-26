-- =====================================================
-- FIX: Row Level Security Policy Error
-- Fixes "new row violates row-level security policy"
-- =====================================================

-- Step 1: Ensure public.users table exists and has correct structure
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'client',
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

-- Step 2: Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Step 4: Create function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger for new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Backfill existing auth users into public.users
INSERT INTO public.users (id, email, full_name, avatar_url, created_at)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    COALESCE(au.raw_user_meta_data->>'avatar_url', ''),
    au.created_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 7: Update coaches RLS policies to be more permissive for inserts
DROP POLICY IF EXISTS "Coaches can create own profile" ON public.coaches;
CREATE POLICY "Coaches can create own profile"
    ON public.coaches FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Coaches can update own profile" ON public.coaches;
CREATE POLICY "Coaches can update own profile"
    ON public.coaches FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view coach profiles" ON public.coaches;
CREATE POLICY "Anyone can view coach profiles"
    ON public.coaches FOR SELECT
    USING (TRUE);

-- Step 8: Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.coaches TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if your user exists in public.users
-- SELECT * FROM public.users WHERE id = auth.uid();

-- Check coaches table structure
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'coaches' AND table_schema = 'public';

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Your profile save should now work!
-- Refresh your app and try saving again.
-- =====================================================
