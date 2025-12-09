-- Migration: Add unique constraint to prevent multiple reviews per user per coach
-- This ensures each user can only submit one review per coach
-- Run this entire script at once in Supabase SQL Editor

-- Step 1: Add all missing columns first
DO $$
BEGIN
    -- Add client_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_reviews'
        AND column_name = 'client_id'
    ) THEN
        EXECUTE 'ALTER TABLE public.cs_reviews ADD COLUMN client_id UUID REFERENCES auth.users(id)';
        RAISE NOTICE 'Added client_id column';
    ELSE
        RAISE NOTICE 'client_id column already exists';
    END IF;

    -- Add content column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_reviews'
        AND column_name = 'content'
    ) THEN
        EXECUTE 'ALTER TABLE public.cs_reviews ADD COLUMN content TEXT';
        RAISE NOTICE 'Added content column';
    ELSE
        RAISE NOTICE 'content column already exists';
    END IF;

    -- Add reviewer_name column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_reviews'
        AND column_name = 'reviewer_name'
    ) THEN
        EXECUTE 'ALTER TABLE public.cs_reviews ADD COLUMN reviewer_name TEXT';
        RAISE NOTICE 'Added reviewer_name column';
    ELSE
        RAISE NOTICE 'reviewer_name column already exists';
    END IF;

    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_reviews'
        AND column_name = 'status'
    ) THEN
        EXECUTE 'ALTER TABLE public.cs_reviews ADD COLUMN status TEXT DEFAULT ''approved''';
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;
END $$;

-- Step 2: Update existing reviews to have 'approved' status if null
UPDATE public.cs_reviews SET status = 'approved' WHERE status IS NULL;

-- Step 3: Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cs_reviews_coach_client_unique'
    ) THEN
        EXECUTE 'ALTER TABLE public.cs_reviews DROP CONSTRAINT cs_reviews_coach_client_unique';
        RAISE NOTICE 'Dropped existing constraint';
    END IF;
END $$;

-- Step 4: Now add the unique constraint (client_id column should exist now)
ALTER TABLE public.cs_reviews
ADD CONSTRAINT cs_reviews_coach_client_unique UNIQUE (coach_id, client_id);

-- Step 5: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cs_reviews_coach_client
ON public.cs_reviews(coach_id, client_id);

-- Step 6: Add comment
COMMENT ON CONSTRAINT cs_reviews_coach_client_unique ON public.cs_reviews
IS 'Ensures each user can only submit one review per coach';

-- Done!
DO $$ BEGIN RAISE NOTICE 'Migration completed successfully!'; END $$;
