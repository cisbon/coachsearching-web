-- UPDATE SCHEMA - Run this on existing databases to add new features
-- Copy and paste this into Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS and ALTER TABLE IF EXISTS)

-- Add new columns to cs_coaches table
DO $$
BEGIN
    -- Add full_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_coaches' AND column_name='full_name') THEN
        ALTER TABLE public.cs_coaches ADD COLUMN full_name TEXT;
        UPDATE public.cs_coaches SET full_name = 'Coach Name' WHERE full_name IS NULL;
        ALTER TABLE public.cs_coaches ALTER COLUMN full_name SET NOT NULL;
    END IF;

    -- Add avatar_url if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_coaches' AND column_name='avatar_url') THEN
        ALTER TABLE public.cs_coaches ADD COLUMN avatar_url TEXT;
    END IF;

    -- Add location if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_coaches' AND column_name='location') THEN
        ALTER TABLE public.cs_coaches ADD COLUMN location TEXT;
    END IF;

    -- Add session_types if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_coaches' AND column_name='session_types') THEN
        ALTER TABLE public.cs_coaches ADD COLUMN session_types TEXT[];
    END IF;

    -- Add availability_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_coaches' AND column_name='availability_status') THEN
        ALTER TABLE public.cs_coaches ADD COLUMN availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable'));
    END IF;

    -- Add rating_average if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_coaches' AND column_name='rating_average') THEN
        ALTER TABLE public.cs_coaches ADD COLUMN rating_average DECIMAL(3, 2) DEFAULT 0;
    END IF;

    -- Add rating_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_coaches' AND column_name='rating_count') THEN
        ALTER TABLE public.cs_coaches ADD COLUMN rating_count INTEGER DEFAULT 0;
    END IF;

    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_coaches' AND column_name='updated_at') THEN
        ALTER TABLE public.cs_coaches ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Change currency default from USD to EUR
    ALTER TABLE public.cs_coaches ALTER COLUMN currency SET DEFAULT 'EUR';

    -- Make title NOT NULL if it isn't already
    UPDATE public.cs_coaches SET title = 'Coach' WHERE title IS NULL;
    ALTER TABLE public.cs_coaches ALTER COLUMN title SET NOT NULL;
END $$;

-- Create cs_businesses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cs_businesses (
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

-- Create cs_clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cs_clients (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB, -- Store preferences like preferred languages, coaching areas, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update cs_user_profiles view to include user_type
CREATE OR REPLACE VIEW public.cs_user_profiles AS
SELECT
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    raw_user_meta_data->>'user_type' as user_type
FROM auth.users;

-- Create or replace function to update coach rating
CREATE OR REPLACE FUNCTION update_coach_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cs_coaches
    SET
        rating_average = (SELECT AVG(rating)::DECIMAL(3,2) FROM cs_reviews WHERE coach_id = NEW.coach_id),
        rating_count = (SELECT COUNT(*) FROM cs_reviews WHERE coach_id = NEW.coach_id),
        updated_at = NOW()
    WHERE id = NEW.coach_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_coach_rating_trigger ON cs_reviews;
CREATE TRIGGER update_coach_rating_trigger
AFTER INSERT OR UPDATE ON cs_reviews
FOR EACH ROW
EXECUTE FUNCTION update_coach_rating();

-- Enable RLS on new tables
ALTER TABLE public.cs_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cs_businesses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cs_businesses' AND policyname = 'Businesses are viewable by everyone'
    ) THEN
        CREATE POLICY "Businesses are viewable by everyone" ON public.cs_businesses FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cs_businesses' AND policyname = 'Businesses can insert own profile'
    ) THEN
        CREATE POLICY "Businesses can insert own profile" ON public.cs_businesses FOR INSERT WITH CHECK ((select auth.uid()) = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cs_businesses' AND policyname = 'Businesses can update own profile'
    ) THEN
        CREATE POLICY "Businesses can update own profile" ON public.cs_businesses FOR UPDATE USING ((select auth.uid()) = id);
    END IF;
END $$;

-- Create RLS policies for cs_clients
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cs_clients' AND policyname = 'Clients can view own profile'
    ) THEN
        CREATE POLICY "Clients can view own profile" ON public.cs_clients FOR SELECT USING ((select auth.uid()) = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cs_clients' AND policyname = 'Clients can insert own profile'
    ) THEN
        CREATE POLICY "Clients can insert own profile" ON public.cs_clients FOR INSERT WITH CHECK ((select auth.uid()) = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cs_clients' AND policyname = 'Clients can update own profile'
    ) THEN
        CREATE POLICY "Clients can update own profile" ON public.cs_clients FOR UPDATE USING ((select auth.uid()) = id);
    END IF;
END $$;

-- Grant permissions
GRANT SELECT ON public.cs_user_profiles TO anon, authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Schema update completed successfully!';
    RAISE NOTICE 'New tables created: cs_businesses, cs_clients';
    RAISE NOTICE 'cs_coaches table updated with new columns';
    RAISE NOTICE 'All RLS policies configured';
END $$;
