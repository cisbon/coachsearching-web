-- ============================================
-- Migration: Create cs_reviews table for coach reviews
-- Date: 2024-12-08
-- Description: Creates the reviews table to store coach reviews
--              and enables public access for testing
-- ============================================

-- Create the reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS cs_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES cs_coaches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewer_name TEXT DEFAULT 'Anonymous',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries by coach_id
CREATE INDEX IF NOT EXISTS idx_cs_reviews_coach_id ON cs_reviews(coach_id);

-- Create index for faster queries by rating
CREATE INDEX IF NOT EXISTS idx_cs_reviews_rating ON cs_reviews(rating);

-- Enable Row Level Security
ALTER TABLE cs_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reviews (public)
CREATE POLICY "Reviews are viewable by everyone"
ON cs_reviews FOR SELECT
USING (true);

-- Policy: Anyone can insert reviews (for testing - can be restricted later)
CREATE POLICY "Anyone can create reviews for testing"
ON cs_reviews FOR INSERT
WITH CHECK (true);

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON cs_reviews FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON cs_reviews FOR DELETE
USING (auth.uid() = user_id);

-- Add rating_average and rating_count columns to cs_coaches if they don't exist
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) DEFAULT 0;

ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Comments for documentation
COMMENT ON TABLE cs_reviews IS 'Stores reviews for coaches from clients';
COMMENT ON COLUMN cs_reviews.coach_id IS 'Reference to the coach being reviewed';
COMMENT ON COLUMN cs_reviews.user_id IS 'Reference to the user who wrote the review (optional)';
COMMENT ON COLUMN cs_reviews.reviewer_name IS 'Display name of the reviewer';
COMMENT ON COLUMN cs_reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN cs_reviews.comment IS 'Review text/comment';

-- ============================================
-- Function to automatically update coach rating when reviews change
-- ============================================

CREATE OR REPLACE FUNCTION update_coach_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE cs_coaches
        SET rating_average = COALESCE((
            SELECT AVG(rating)::NUMERIC(3,2)
            FROM cs_reviews
            WHERE coach_id = OLD.coach_id
        ), 0),
        rating_count = (
            SELECT COUNT(*)
            FROM cs_reviews
            WHERE coach_id = OLD.coach_id
        )
        WHERE id = OLD.coach_id;
        RETURN OLD;
    ELSE
        UPDATE cs_coaches
        SET rating_average = COALESCE((
            SELECT AVG(rating)::NUMERIC(3,2)
            FROM cs_reviews
            WHERE coach_id = NEW.coach_id
        ), 0),
        rating_count = (
            SELECT COUNT(*)
            FROM cs_reviews
            WHERE coach_id = NEW.coach_id
        )
        WHERE id = NEW.coach_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update coach rating on review changes
DROP TRIGGER IF EXISTS trigger_update_coach_rating ON cs_reviews;
CREATE TRIGGER trigger_update_coach_rating
AFTER INSERT OR UPDATE OR DELETE ON cs_reviews
FOR EACH ROW EXECUTE FUNCTION update_coach_rating();
