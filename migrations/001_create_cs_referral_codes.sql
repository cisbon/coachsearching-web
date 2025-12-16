-- ============================================================================
-- Migration: Create cs_referral_codes table
-- Description: Stores referral codes for coach registration promotions
-- Usage: Run this SQL directly in Supabase SQL Editor
-- ============================================================================

-- Create the referral codes table
CREATE TABLE IF NOT EXISTS cs_referral_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    description TEXT,
    max_uses INTEGER DEFAULT NULL,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ DEFAULT NULL,
    benefit_type VARCHAR(50) DEFAULT 'free_year_premium',
    benefit_value JSONB DEFAULT '{"months": 12}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_cs_referral_codes_code ON cs_referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_cs_referral_codes_user_id ON cs_referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_referral_codes_active ON cs_referral_codes(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE cs_referral_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active referral codes (for validation)
CREATE POLICY "Anyone can validate referral codes"
    ON cs_referral_codes
    FOR SELECT
    USING (is_active = true);

-- Policy: Only admins can insert/update/delete (via service role)
-- Note: Regular users cannot modify referral codes

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_cs_referral_codes_updated_at ON cs_referral_codes;
CREATE TRIGGER update_cs_referral_codes_updated_at
    BEFORE UPDATE ON cs_referral_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Optional: Create table to track referral code usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS cs_referral_code_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referral_code_id UUID NOT NULL REFERENCES cs_referral_codes(id) ON DELETE CASCADE,
    used_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    benefit_applied BOOLEAN DEFAULT false,
    benefit_applied_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE(referral_code_id, used_by_user_id)
);

-- Create indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_cs_referral_code_usage_code_id ON cs_referral_code_usage(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_cs_referral_code_usage_user_id ON cs_referral_code_usage(used_by_user_id);

-- Enable Row Level Security
ALTER TABLE cs_referral_code_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own usage
CREATE POLICY "Users can view their own referral usage"
    ON cs_referral_code_usage
    FOR SELECT
    USING (auth.uid() = used_by_user_id);

-- ============================================================================
-- Example: Insert some test referral codes
-- Uncomment and modify as needed
-- ============================================================================

-- INSERT INTO cs_referral_codes (code, description, max_uses) VALUES
--     ('LAUNCH2024', 'Launch promotion code', 100),
--     ('FRIEND50', 'Friend referral code', NULL),
--     ('PARTNER100', 'Partner promotion', 50);

-- ============================================================================
-- Helpful queries for managing referral codes
-- ============================================================================

-- View all active codes with usage stats:
-- SELECT
--     code,
--     description,
--     current_uses,
--     max_uses,
--     CASE WHEN max_uses IS NULL THEN 'Unlimited'
--          ELSE (max_uses - current_uses)::text || ' remaining'
--     END as availability
-- FROM cs_referral_codes
-- WHERE is_active = true;

-- Increment usage count when a code is used:
-- UPDATE cs_referral_codes
-- SET current_uses = current_uses + 1
-- WHERE code = 'CODE_HERE'
--   AND is_active = true
--   AND (max_uses IS NULL OR current_uses < max_uses);
