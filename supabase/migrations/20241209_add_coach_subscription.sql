-- Migration: Add subscription fields to cs_coaches for MVP monetization
-- Coaches get 14-day trial, then need yearly subscription (€50/year)

-- Add subscription fields to cs_coaches table
DO $$
BEGIN
    -- Add subscription_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_coaches'
        AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE public.cs_coaches
        ADD COLUMN subscription_status TEXT DEFAULT 'trial'
        CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'));
        RAISE NOTICE 'Added subscription_status column';
    END IF;

    -- Add trial_ends_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_coaches'
        AND column_name = 'trial_ends_at'
    ) THEN
        ALTER TABLE public.cs_coaches
        ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days');
        RAISE NOTICE 'Added trial_ends_at column';
    END IF;

    -- Add subscription_ends_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_coaches'
        AND column_name = 'subscription_ends_at'
    ) THEN
        ALTER TABLE public.cs_coaches
        ADD COLUMN subscription_ends_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added subscription_ends_at column';
    END IF;

    -- Add stripe_subscription_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_coaches'
        AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE public.cs_coaches
        ADD COLUMN stripe_subscription_id TEXT;
        RAISE NOTICE 'Added stripe_subscription_id column';
    END IF;

    -- Add subscription_price_yearly column (in cents)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cs_coaches'
        AND column_name = 'subscription_price_yearly'
    ) THEN
        ALTER TABLE public.cs_coaches
        ADD COLUMN subscription_price_yearly INTEGER DEFAULT 5000; -- €50.00 in cents
        RAISE NOTICE 'Added subscription_price_yearly column';
    END IF;
END $$;

-- Update existing coaches: set them to trial with 14 days from now
-- (only for coaches that don't have subscription_status set yet)
UPDATE public.cs_coaches
SET
    subscription_status = 'trial',
    trial_ends_at = NOW() + INTERVAL '14 days'
WHERE subscription_status IS NULL OR subscription_status = 'trial';

-- Create index for quick subscription status lookups
CREATE INDEX IF NOT EXISTS idx_cs_coaches_subscription_status
ON public.cs_coaches(subscription_status);

CREATE INDEX IF NOT EXISTS idx_cs_coaches_trial_ends_at
ON public.cs_coaches(trial_ends_at);

-- Create a view for active coaches (trial or active subscription)
CREATE OR REPLACE VIEW public.cs_active_coaches AS
SELECT * FROM public.cs_coaches
WHERE
    is_active = true
    AND (
        (subscription_status = 'trial' AND trial_ends_at > NOW())
        OR (subscription_status = 'active' AND subscription_ends_at > NOW())
    );

-- Grant access to the view
GRANT SELECT ON public.cs_active_coaches TO anon, authenticated;

-- Function to check if a coach's subscription is valid
CREATE OR REPLACE FUNCTION public.is_coach_subscription_valid(coach_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    coach_record RECORD;
BEGIN
    SELECT subscription_status, trial_ends_at, subscription_ends_at
    INTO coach_record
    FROM public.cs_coaches
    WHERE id = coach_uuid;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check trial
    IF coach_record.subscription_status = 'trial' THEN
        RETURN coach_record.trial_ends_at > NOW();
    END IF;

    -- Check active subscription
    IF coach_record.subscription_status = 'active' THEN
        RETURN coach_record.subscription_ends_at > NOW();
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION public.is_coach_subscription_valid(UUID) TO anon, authenticated;

COMMENT ON COLUMN public.cs_coaches.subscription_status IS 'trial = 14-day free trial, active = paid subscription, expired = subscription ended, cancelled = user cancelled';
COMMENT ON COLUMN public.cs_coaches.trial_ends_at IS 'When the 14-day trial period ends';
COMMENT ON COLUMN public.cs_coaches.subscription_ends_at IS 'When the current paid subscription ends';
COMMENT ON COLUMN public.cs_coaches.stripe_subscription_id IS 'Stripe subscription ID for recurring billing';

DO $$ BEGIN RAISE NOTICE 'Subscription migration completed successfully!'; END $$;
