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

-- ============================================
-- PHASE 1: BOOKING SYSTEM SCHEMA UPDATES
-- ============================================

-- Create coach availability table
CREATE TABLE IF NOT EXISTS public.cs_coach_availability (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, day_of_week, start_time)
);

-- Create coach availability overrides table
CREATE TABLE IF NOT EXISTS public.cs_coach_availability_overrides (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_available BOOLEAN NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, date, start_time)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.cs_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update cs_bookings table with new columns
DO $$
BEGIN
    -- Add duration_minutes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='duration_minutes') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN duration_minutes INTEGER;
        UPDATE public.cs_bookings SET duration_minutes = EXTRACT(EPOCH FROM (end_time - start_time))/60 WHERE duration_minutes IS NULL;
        ALTER TABLE public.cs_bookings ALTER COLUMN duration_minutes SET NOT NULL;
    END IF;

    -- Add meeting_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='meeting_type') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN meeting_type TEXT DEFAULT 'online' CHECK (meeting_type IN ('online', 'onsite'));
    END IF;

    -- Add meeting_location if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='meeting_location') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN meeting_location TEXT;
    END IF;

    -- Add platform_fee if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='platform_fee') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN platform_fee DECIMAL(10, 2);
    END IF;

    -- Add coach_payout if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='coach_payout') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN coach_payout DECIMAL(10, 2);
    END IF;

    -- Add stripe_charge_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='stripe_charge_id') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN stripe_charge_id TEXT;
    END IF;

    -- Add client_notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='client_notes') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN client_notes TEXT;
    END IF;

    -- Add coach_notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='coach_notes') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN coach_notes TEXT;
    END IF;

    -- Add cancelled_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='cancelled_at') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add cancelled_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='cancelled_by') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN cancelled_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add cancellation_reason if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='cancellation_reason') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN cancellation_reason TEXT;
    END IF;

    -- Add completed_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='completed_at') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='cs_bookings' AND column_name='updated_at') THEN
        ALTER TABLE public.cs_bookings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Update status check constraint to include no_show
    ALTER TABLE public.cs_bookings DROP CONSTRAINT IF EXISTS cs_bookings_status_check;
    ALTER TABLE public.cs_bookings ADD CONSTRAINT cs_bookings_status_check
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));
END $$;

-- Enable RLS on new tables
ALTER TABLE public.cs_coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_coach_availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coach availability
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_coach_availability' AND policyname = 'Availability viewable by everyone') THEN
        CREATE POLICY "Availability viewable by everyone" ON public.cs_coach_availability FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_coach_availability' AND policyname = 'Coaches can insert own availability') THEN
        CREATE POLICY "Coaches can insert own availability" ON public.cs_coach_availability FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_coach_availability' AND policyname = 'Coaches can update own availability') THEN
        CREATE POLICY "Coaches can update own availability" ON public.cs_coach_availability FOR UPDATE USING ((select auth.uid()) = coach_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_coach_availability' AND policyname = 'Coaches can delete own availability') THEN
        CREATE POLICY "Coaches can delete own availability" ON public.cs_coach_availability FOR DELETE USING ((select auth.uid()) = coach_id);
    END IF;
END $$;

-- RLS Policies for coach availability overrides
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_coach_availability_overrides' AND policyname = 'Availability overrides viewable by everyone') THEN
        CREATE POLICY "Availability overrides viewable by everyone" ON public.cs_coach_availability_overrides FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_coach_availability_overrides' AND policyname = 'Coaches can insert own overrides') THEN
        CREATE POLICY "Coaches can insert own overrides" ON public.cs_coach_availability_overrides FOR INSERT WITH CHECK ((select auth.uid()) = coach_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_coach_availability_overrides' AND policyname = 'Coaches can update own overrides') THEN
        CREATE POLICY "Coaches can update own overrides" ON public.cs_coach_availability_overrides FOR UPDATE USING ((select auth.uid()) = coach_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_coach_availability_overrides' AND policyname = 'Coaches can delete own overrides') THEN
        CREATE POLICY "Coaches can delete own overrides" ON public.cs_coach_availability_overrides FOR DELETE USING ((select auth.uid()) = coach_id);
    END IF;
END $$;

-- RLS Policies for notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_notifications' AND policyname = 'Users can view own notifications') THEN
        CREATE POLICY "Users can view own notifications" ON public.cs_notifications FOR SELECT USING ((select auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_notifications' AND policyname = 'Users can update own notifications') THEN
        CREATE POLICY "Users can update own notifications" ON public.cs_notifications FOR UPDATE USING ((select auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_notifications' AND policyname = 'System can insert notifications') THEN
        CREATE POLICY "System can insert notifications" ON public.cs_notifications FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Update bookings RLS policy to allow both parties to update
DO $$
BEGIN
    -- Drop old policy if exists
    DROP POLICY IF EXISTS "Coaches can update bookings" ON public.cs_bookings;

    -- Create new policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cs_bookings' AND policyname = 'Involved parties can update bookings') THEN
        CREATE POLICY "Involved parties can update bookings" ON public.cs_bookings FOR UPDATE USING (
            (select auth.uid()) = coach_id OR (select auth.uid()) = client_id
        );
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_availability_coach_day ON public.cs_coach_availability(coach_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_coach_overrides_coach_date ON public.cs_coach_availability_overrides(coach_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_coach_time ON public.cs_bookings(coach_id, start_time, status);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.cs_bookings(client_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON public.cs_bookings(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.cs_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_coach ON public.cs_reviews(coach_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Schema update completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New tables created:';
    RAISE NOTICE '  - cs_businesses';
    RAISE NOTICE '  - cs_clients';
    RAISE NOTICE '  - cs_coach_availability';
    RAISE NOTICE '  - cs_coach_availability_overrides';
    RAISE NOTICE '  - cs_notifications';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables updated:';
    RAISE NOTICE '  - cs_coaches (new columns)';
    RAISE NOTICE '  - cs_bookings (booking flow columns)';
    RAISE NOTICE '';
    RAISE NOTICE 'All RLS policies and indexes configured!';
    RAISE NOTICE '========================================';
END $$;
