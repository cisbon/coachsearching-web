-- ============================================================================
-- cs_coach_services table
-- Run this in the Supabase SQL Editor
-- ============================================================================

CREATE TABLE public.cs_coach_services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    unit TEXT NOT NULL DEFAULT 'hour' CHECK (unit IN ('hour', 'day', 'session')),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coach_services_coach ON public.cs_coach_services(coach_id);

-- Grant permissions
GRANT SELECT ON public.cs_coach_services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cs_coach_services TO authenticated;

-- Enable RLS
ALTER TABLE public.cs_coach_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies (coach_id -> cs_coaches.id, check via cs_coaches.user_id)
CREATE POLICY "Coach services are viewable by everyone"
    ON public.cs_coach_services FOR SELECT USING (true);

CREATE POLICY "Coaches can insert own services"
    ON public.cs_coach_services FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Coaches can update own services"
    ON public.cs_coach_services FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Coaches can delete own services"
    ON public.cs_coach_services FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cs_coaches
            WHERE cs_coaches.id = coach_id
            AND cs_coaches.user_id = (SELECT auth.uid())
        )
    );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_coach_service_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_service_timestamp
    BEFORE UPDATE ON public.cs_coach_services
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_service_updated_at();
