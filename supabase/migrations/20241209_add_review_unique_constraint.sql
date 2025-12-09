-- Migration: Add unique constraint to prevent multiple reviews per user per coach
-- This ensures each user can only submit one review per coach

-- First, check if the constraint already exists and drop it if needed
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cs_reviews_coach_client_unique'
    ) THEN
        ALTER TABLE public.cs_reviews DROP CONSTRAINT cs_reviews_coach_client_unique;
    END IF;
END $$;

-- Add unique constraint on coach_id + client_id combination
-- This prevents the same user from reviewing the same coach multiple times
ALTER TABLE public.cs_reviews
ADD CONSTRAINT cs_reviews_coach_client_unique UNIQUE (coach_id, client_id);

-- Add reviewer_name column if it doesn't exist (for displaying reviewer's name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_reviews'
        AND column_name = 'reviewer_name'
    ) THEN
        ALTER TABLE public.cs_reviews ADD COLUMN reviewer_name TEXT;
    END IF;
END $$;

-- Add status column if it doesn't exist (for moderation: pending, approved, rejected)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_reviews'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.cs_reviews ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Update existing reviews to have 'approved' status
UPDATE public.cs_reviews SET status = 'approved' WHERE status IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cs_reviews_coach_client
ON public.cs_reviews(coach_id, client_id);

-- Add RLS policy for authenticated users to insert reviews
-- (if not already exists)
DO $$
BEGIN
    -- Check if policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'cs_reviews'
        AND policyname = 'Users can insert their own reviews'
    ) THEN
        CREATE POLICY "Users can insert their own reviews"
            ON public.cs_reviews FOR INSERT
            WITH CHECK (auth.uid() = client_id);
    END IF;
END $$;

-- Comment on the constraint
COMMENT ON CONSTRAINT cs_reviews_coach_client_unique ON public.cs_reviews
IS 'Ensures each user can only submit one review per coach';
