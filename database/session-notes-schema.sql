-- =====================================================
-- SESSION NOTES & PROGRESS TRACKING
-- For coaches to track client sessions and growth paths
-- =====================================================

-- Session notes table
CREATE TABLE IF NOT EXISTS public.session_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Step 1: Session Overview
    client_mood TEXT, -- 'energized', 'positive', 'neutral', 'stressed', 'low'
    client_energy_level INTEGER CHECK (client_energy_level >= 1 AND client_energy_level <= 5),
    session_focus_areas TEXT[] DEFAULT '{}', -- ['career', 'relationships', 'health', 'mindset', etc.]

    -- Step 2: What We Covered
    topics_covered TEXT[] DEFAULT '{}', -- Quick topic tags
    key_achievements TEXT[] DEFAULT '{}', -- Achievements during session
    breakthroughs TEXT[] DEFAULT '{}', -- Aha moments

    -- Step 3: Challenges & Insights
    challenges TEXT[] DEFAULT '{}', -- Challenges discussed
    obstacles TEXT[] DEFAULT '{}', -- Specific obstacles
    insights TEXT[] DEFAULT '{}', -- Key insights discovered

    -- Step 4: Next Steps
    action_items JSONB DEFAULT '[]', -- [{text, priority, dueDate, completed}]
    next_session_focus TEXT, -- Main focus for next session
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_type TEXT, -- 'email', 'resources', 'homework_check'

    -- Step 5: Summary
    session_effectiveness INTEGER CHECK (session_effectiveness >= 1 AND session_effectiveness <= 5),
    progress_rating INTEGER CHECK (progress_rating >= 1 AND progress_rating <= 5), -- Client's progress since last session
    detailed_notes TEXT, -- Optional free-form notes
    private_notes TEXT, -- Coach's private observations

    -- Metadata
    session_date TIMESTAMPTZ,
    session_duration INTEGER, -- minutes
    is_draft BOOLEAN DEFAULT FALSE, -- Allow saving incomplete notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT session_notes_unique_booking UNIQUE(booking_id)
);

-- Client goals tracking
CREATE TABLE IF NOT EXISTS public.client_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    goal_title TEXT NOT NULL,
    goal_description TEXT,
    category TEXT, -- 'career', 'health', 'relationships', 'financial', 'personal_growth'
    target_date DATE,
    status TEXT DEFAULT 'in_progress', -- 'not_started', 'in_progress', 'completed', 'on_hold', 'abandoned'
    priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'

    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    milestones JSONB DEFAULT '[]', -- [{title, completed, completedDate}]

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Session templates (common session structures)
CREATE TABLE IF NOT EXISTS public.session_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,

    template_name TEXT NOT NULL,
    description TEXT,

    -- Pre-configured options
    default_focus_areas TEXT[] DEFAULT '{}',
    default_topics TEXT[] DEFAULT '{}',
    suggested_questions TEXT[] DEFAULT '{}',

    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client tags (for organization)
CREATE TABLE IF NOT EXISTS public.client_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    tag TEXT NOT NULL, -- 'high-priority', 'long-term', 'executive', etc.
    color TEXT, -- Hex color for visual organization

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, client_id, tag)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_session_notes_coach ON public.session_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_client ON public.session_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_booking ON public.session_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_date ON public.session_notes(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_session_notes_draft ON public.session_notes(is_draft) WHERE is_draft = true;

CREATE INDEX IF NOT EXISTS idx_client_goals_coach ON public.client_goals(coach_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_client ON public.client_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_status ON public.client_goals(status);

CREATE INDEX IF NOT EXISTS idx_client_tags_coach ON public.client_tags(coach_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_client ON public.client_tags(client_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own session notes
DROP POLICY IF EXISTS "Coaches can view own session notes" ON public.session_notes;
CREATE POLICY "Coaches can view own session notes" ON public.session_notes
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.coaches WHERE id = coach_id)
    );

DROP POLICY IF EXISTS "Coaches can create own session notes" ON public.session_notes;
CREATE POLICY "Coaches can create own session notes" ON public.session_notes
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.coaches WHERE id = coach_id)
    );

DROP POLICY IF EXISTS "Coaches can update own session notes" ON public.session_notes;
CREATE POLICY "Coaches can update own session notes" ON public.session_notes
    FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM public.coaches WHERE id = coach_id)
    );

DROP POLICY IF EXISTS "Coaches can delete own session notes" ON public.session_notes;
CREATE POLICY "Coaches can delete own session notes" ON public.session_notes
    FOR DELETE USING (
        auth.uid() IN (SELECT user_id FROM public.coaches WHERE id = coach_id)
    );

-- Clients can view their own session notes (read-only)
DROP POLICY IF EXISTS "Clients can view own session notes" ON public.session_notes;
CREATE POLICY "Clients can view own session notes" ON public.session_notes
    FOR SELECT USING (auth.uid() = client_id);

-- Similar policies for client_goals
DROP POLICY IF EXISTS "Coaches can manage client goals" ON public.client_goals;
CREATE POLICY "Coaches can manage client goals" ON public.client_goals
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.coaches WHERE id = coach_id)
    );

DROP POLICY IF EXISTS "Clients can view own goals" ON public.client_goals;
CREATE POLICY "Clients can view own goals" ON public.client_goals
    FOR SELECT USING (auth.uid() = client_id);

-- Session templates
DROP POLICY IF EXISTS "Coaches can manage own templates" ON public.session_templates;
CREATE POLICY "Coaches can manage own templates" ON public.session_templates
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.coaches WHERE id = coach_id)
    );

-- Client tags
DROP POLICY IF EXISTS "Coaches can manage own client tags" ON public.client_tags;
CREATE POLICY "Coaches can manage own client tags" ON public.client_tags
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.coaches WHERE id = coach_id)
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS update_session_notes_updated_at ON public.session_notes;
CREATE TRIGGER update_session_notes_updated_at
    BEFORE UPDATE ON public.session_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_goals_updated_at ON public.client_goals;
CREATE TRIGGER update_client_goals_updated_at
    BEFORE UPDATE ON public.client_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get client session history with notes
CREATE OR REPLACE FUNCTION get_client_session_history(
    p_coach_id UUID,
    p_client_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    session_id UUID,
    session_date TIMESTAMPTZ,
    duration INTEGER,
    focus_areas TEXT[],
    effectiveness INTEGER,
    progress_rating INTEGER,
    action_items JSONB,
    has_notes BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sn.id,
        sn.session_date,
        sn.session_duration,
        sn.session_focus_areas,
        sn.session_effectiveness,
        sn.progress_rating,
        sn.action_items,
        (sn.detailed_notes IS NOT NULL AND sn.detailed_notes != '') AS has_notes
    FROM public.session_notes sn
    WHERE sn.coach_id = p_coach_id
      AND sn.client_id = p_client_id
      AND sn.is_draft = false
    ORDER BY sn.session_date DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get client progress summary
CREATE OR REPLACE FUNCTION get_client_progress_summary(
    p_coach_id UUID,
    p_client_id UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_sessions', COUNT(*),
        'avg_effectiveness', ROUND(AVG(session_effectiveness), 2),
        'avg_progress', ROUND(AVG(progress_rating), 2),
        'total_achievements', (
            SELECT COUNT(*)
            FROM public.session_notes sn, unnest(sn.key_achievements)
            WHERE sn.coach_id = p_coach_id AND sn.client_id = p_client_id
        ),
        'pending_action_items', (
            SELECT COUNT(*)
            FROM public.session_notes sn,
                 jsonb_array_elements(sn.action_items) AS item
            WHERE sn.coach_id = p_coach_id
              AND sn.client_id = p_client_id
              AND (item->>'completed')::boolean = false
        ),
        'active_goals', (
            SELECT COUNT(*)
            FROM public.client_goals
            WHERE coach_id = p_coach_id
              AND client_id = p_client_id
              AND status = 'in_progress'
        )
    ) INTO result
    FROM public.session_notes
    WHERE coach_id = p_coach_id
      AND client_id = p_client_id
      AND is_draft = false;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Session Notes & Progress Tracking installed!';
    RAISE NOTICE '';
    RAISE NOTICE 'New tables created:';
    RAISE NOTICE '  - session_notes (session tracking)';
    RAISE NOTICE '  - client_goals (goal management)';
    RAISE NOTICE '  - session_templates (reusable templates)';
    RAISE NOTICE '  - client_tags (client organization)';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to track client progress! 🎯';
    RAISE NOTICE '';
END $$;
