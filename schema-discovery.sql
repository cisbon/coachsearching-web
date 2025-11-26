-- schema-discovery.sql - Hybrid Coach Discovery System
-- Database schema for quiz, search analytics, and concierge matching

-- =============================================
-- QUIZ RESPONSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cs_quiz_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    email TEXT,

    -- Quiz answers stored as JSONB
    answers JSONB NOT NULL DEFAULT '{}',

    -- Matching results
    matched_coach_ids UUID[] DEFAULT '{}',
    match_scores JSONB DEFAULT '{}', -- {coach_id: score, ...}

    -- Funnel tracking
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    results_viewed_at TIMESTAMPTZ,
    coach_clicked_at TIMESTAMPTZ,
    booking_started_at TIMESTAMPTZ,

    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    landing_page TEXT,

    -- Device info
    device_type TEXT, -- 'mobile', 'tablet', 'desktop'
    browser TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session ON cs_quiz_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user ON cs_quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_email ON cs_quiz_responses(email);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_created ON cs_quiz_responses(created_at);

-- =============================================
-- SEARCH EVENTS TABLE (Analytics)
-- =============================================
CREATE TABLE IF NOT EXISTS cs_search_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),

    -- Search parameters
    search_query TEXT,
    filters JSONB DEFAULT '{}', -- {specialty: [], location: '', priceRange: {}, etc.}

    -- Results
    results_count INTEGER DEFAULT 0,
    result_coach_ids UUID[] DEFAULT '{}',

    -- User interactions
    coaches_viewed UUID[] DEFAULT '{}',
    coaches_clicked UUID[] DEFAULT '{}',
    booking_started_coach_id UUID,

    -- Performance
    response_time_ms INTEGER,

    -- Context
    page_url TEXT,
    referrer TEXT,
    device_type TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_events_session ON cs_search_events(session_id);
CREATE INDEX IF NOT EXISTS idx_search_events_query ON cs_search_events(search_query);
CREATE INDEX IF NOT EXISTS idx_search_events_created ON cs_search_events(created_at);
CREATE INDEX IF NOT EXISTS idx_search_events_filters ON cs_search_events USING GIN(filters);

-- =============================================
-- CONCIERGE REQUESTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cs_concierge_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),

    -- Contact info
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    preferred_contact TEXT DEFAULT 'email', -- 'email', 'phone', 'whatsapp'

    -- Requirements
    coaching_goals TEXT,
    specialties_needed TEXT[],
    budget_range TEXT, -- 'under_100', '100_200', '200_plus'
    timeline TEXT, -- 'asap', 'within_week', 'within_month', 'exploring'
    session_preference TEXT, -- 'online', 'onsite', 'both'
    location TEXT,
    language_preference TEXT[],
    additional_notes TEXT,

    -- Quiz context (if came from quiz)
    quiz_response_id UUID REFERENCES cs_quiz_responses(id),

    -- Status tracking
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'matched', 'closed'
    assigned_to TEXT, -- Admin handling the request

    -- Matching results
    recommended_coach_ids UUID[] DEFAULT '{}',
    matched_coach_id UUID REFERENCES cs_coaches(id),

    -- Communication log
    notes JSONB DEFAULT '[]', -- [{timestamp, author, note}, ...]

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    first_contact_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_concierge_status ON cs_concierge_requests(status);
CREATE INDEX IF NOT EXISTS idx_concierge_email ON cs_concierge_requests(email);
CREATE INDEX IF NOT EXISTS idx_concierge_created ON cs_concierge_requests(created_at);

-- =============================================
-- QUIZ QUESTION CONFIGS (for dynamic quiz)
-- =============================================
CREATE TABLE IF NOT EXISTS cs_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_key TEXT UNIQUE NOT NULL, -- 'goal', 'specialty', 'experience', etc.
    question_text JSONB NOT NULL, -- {en: "...", de: "...", es: "...", fr: "...", it: "..."}
    question_type TEXT NOT NULL, -- 'single', 'multiple', 'scale', 'text'
    options JSONB, -- [{value, label: {en, de, ...}, icon, weight_config}, ...]
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,

    -- Scoring configuration
    scoring_rules JSONB DEFAULT '{}', -- How answers affect coach matching

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default quiz questions
INSERT INTO cs_quiz_questions (question_key, question_text, question_type, options, sort_order, scoring_rules) VALUES
(
    'goal',
    '{"en": "What''s your primary coaching goal?", "de": "Was ist Ihr Hauptziel?", "es": "¿Cuál es tu objetivo principal?", "fr": "Quel est votre objectif principal?", "it": "Qual è il tuo obiettivo principale?"}',
    'single',
    '[
        {"value": "career", "label": {"en": "Career Growth", "de": "Karriereentwicklung", "es": "Crecimiento profesional", "fr": "Évolution de carrière", "it": "Crescita professionale"}, "icon": "💼"},
        {"value": "leadership", "label": {"en": "Leadership Development", "de": "Führungsentwicklung", "es": "Desarrollo de liderazgo", "fr": "Développement du leadership", "it": "Sviluppo della leadership"}, "icon": "👔"},
        {"value": "life", "label": {"en": "Life Balance", "de": "Work-Life-Balance", "es": "Equilibrio de vida", "fr": "Équilibre de vie", "it": "Equilibrio di vita"}, "icon": "⚖️"},
        {"value": "health", "label": {"en": "Health & Wellness", "de": "Gesundheit & Wellness", "es": "Salud y bienestar", "fr": "Santé et bien-être", "it": "Salute e benessere"}, "icon": "🏃"},
        {"value": "business", "label": {"en": "Business Strategy", "de": "Unternehmensstrategie", "es": "Estrategia empresarial", "fr": "Stratégie d''entreprise", "it": "Strategia aziendale"}, "icon": "📈"},
        {"value": "relationships", "label": {"en": "Relationships", "de": "Beziehungen", "es": "Relaciones", "fr": "Relations", "it": "Relazioni"}, "icon": "❤️"}
    ]',
    1,
    '{"field": "specialties", "match_type": "contains"}'
),
(
    'experience',
    '{"en": "Have you worked with a coach before?", "de": "Haben Sie schon mit einem Coach gearbeitet?", "es": "¿Has trabajado con un coach antes?", "fr": "Avez-vous déjà travaillé avec un coach?", "it": "Hai già lavorato con un coach?"}',
    'single',
    '[
        {"value": "first_time", "label": {"en": "This is my first time", "de": "Das ist mein erstes Mal", "es": "Es mi primera vez", "fr": "C''est ma première fois", "it": "È la mia prima volta"}, "icon": "🌟"},
        {"value": "some", "label": {"en": "I''ve had a few sessions", "de": "Ich hatte einige Sitzungen", "es": "He tenido algunas sesiones", "fr": "J''ai eu quelques séances", "it": "Ho avuto alcune sessioni"}, "icon": "📝"},
        {"value": "experienced", "label": {"en": "I''m experienced with coaching", "de": "Ich habe Erfahrung mit Coaching", "es": "Tengo experiencia con coaching", "fr": "Je suis expérimenté avec le coaching", "it": "Ho esperienza con il coaching"}, "icon": "🎯"}
    ]',
    2,
    '{"field": "years_experience", "preference": {"first_time": "any", "some": "moderate", "experienced": "high"}}'
),
(
    'session_type',
    '{"en": "How would you prefer to meet?", "de": "Wie möchten Sie sich treffen?", "es": "¿Cómo preferirías reunirte?", "fr": "Comment préférez-vous vous rencontrer?", "it": "Come preferiresti incontrarti?"}',
    'single',
    '[
        {"value": "online", "label": {"en": "Online (Video call)", "de": "Online (Videoanruf)", "es": "En línea (Videollamada)", "fr": "En ligne (Appel vidéo)", "it": "Online (Videochiamata)"}, "icon": "💻"},
        {"value": "onsite", "label": {"en": "In-person", "de": "Persönlich", "es": "En persona", "fr": "En personne", "it": "Di persona"}, "icon": "🏢"},
        {"value": "both", "label": {"en": "Both work for me", "de": "Beides ist für mich okay", "es": "Ambos me funcionan", "fr": "Les deux me conviennent", "it": "Entrambi vanno bene"}, "icon": "✨"}
    ]',
    3,
    '{"field": "session_types", "match_type": "contains"}'
),
(
    'location',
    '{"en": "Where are you located?", "de": "Wo befinden Sie sich?", "es": "¿Dónde te encuentras?", "fr": "Où êtes-vous situé?", "it": "Dove ti trovi?"}',
    'text',
    null,
    4,
    '{"field": "city", "match_type": "proximity", "fallback": "any"}'
),
(
    'budget',
    '{"en": "What''s your budget per session?", "de": "Was ist Ihr Budget pro Sitzung?", "es": "¿Cuál es tu presupuesto por sesión?", "fr": "Quel est votre budget par séance?", "it": "Qual è il tuo budget per sessione?"}',
    'single',
    '[
        {"value": "under_50", "label": {"en": "Under €50", "de": "Unter 50€", "es": "Menos de 50€", "fr": "Moins de 50€", "it": "Meno di 50€"}, "icon": "💰", "range": [0, 50]},
        {"value": "50_100", "label": {"en": "€50 - €100", "de": "50€ - 100€", "es": "50€ - 100€", "fr": "50€ - 100€", "it": "50€ - 100€"}, "icon": "💰💰", "range": [50, 100]},
        {"value": "100_200", "label": {"en": "€100 - €200", "de": "100€ - 200€", "es": "100€ - 200€", "fr": "100€ - 200€", "it": "100€ - 200€"}, "icon": "💰💰💰", "range": [100, 200]},
        {"value": "200_plus", "label": {"en": "€200+", "de": "200€+", "es": "200€+", "fr": "200€+", "it": "200€+"}, "icon": "💎", "range": [200, 9999]}
    ]',
    5,
    '{"field": "hourly_rate", "match_type": "range"}'
),
(
    'language',
    '{"en": "What language do you prefer?", "de": "Welche Sprache bevorzugen Sie?", "es": "¿Qué idioma prefieres?", "fr": "Quelle langue préférez-vous?", "it": "Quale lingua preferisci?"}',
    'multiple',
    '[
        {"value": "en", "label": {"en": "English", "de": "Englisch", "es": "Inglés", "fr": "Anglais", "it": "Inglese"}, "icon": "🇬🇧"},
        {"value": "de", "label": {"en": "German", "de": "Deutsch", "es": "Alemán", "fr": "Allemand", "it": "Tedesco"}, "icon": "🇩🇪"},
        {"value": "es", "label": {"en": "Spanish", "de": "Spanisch", "es": "Español", "fr": "Espagnol", "it": "Spagnolo"}, "icon": "🇪🇸"},
        {"value": "fr", "label": {"en": "French", "de": "Französisch", "es": "Francés", "fr": "Français", "it": "Francese"}, "icon": "🇫🇷"},
        {"value": "it", "label": {"en": "Italian", "de": "Italienisch", "es": "Italiano", "fr": "Italien", "it": "Italiano"}, "icon": "🇮🇹"}
    ]',
    6,
    '{"field": "languages", "match_type": "intersects"}'
),
(
    'importance',
    '{"en": "What matters most to you in a coach?", "de": "Was ist Ihnen bei einem Coach am wichtigsten?", "es": "¿Qué es lo más importante para ti en un coach?", "fr": "Qu''est-ce qui compte le plus pour vous chez un coach?", "it": "Cosa conta di più per te in un coach?"}',
    'multiple',
    '[
        {"value": "credentials", "label": {"en": "Certifications & Credentials", "de": "Zertifikate & Qualifikationen", "es": "Certificaciones y credenciales", "fr": "Certifications et diplômes", "it": "Certificazioni e credenziali"}, "icon": "🎓", "weight_boost": {"trust_score": 1.5}},
        {"value": "experience", "label": {"en": "Years of Experience", "de": "Berufserfahrung", "es": "Años de experiencia", "fr": "Années d''expérience", "it": "Anni di esperienza"}, "icon": "⭐", "weight_boost": {"years_experience": 1.5}},
        {"value": "reviews", "label": {"en": "Client Reviews", "de": "Kundenbewertungen", "es": "Reseñas de clientes", "fr": "Avis clients", "it": "Recensioni clienti"}, "icon": "💬", "weight_boost": {"rating_average": 1.5}},
        {"value": "video", "label": {"en": "Video Introduction", "de": "Video-Vorstellung", "es": "Video de presentación", "fr": "Vidéo de présentation", "it": "Video di presentazione"}, "icon": "🎥", "weight_boost": {"has_video": 2.0}},
        {"value": "price", "label": {"en": "Affordable Pricing", "de": "Bezahlbare Preise", "es": "Precios asequibles", "fr": "Prix abordables", "it": "Prezzi accessibili"}, "icon": "💰", "weight_boost": {"price_score": 1.5}}
    ]',
    7,
    '{"type": "weight_modifier"}'
),
(
    'timeline',
    '{"en": "When would you like to start?", "de": "Wann möchten Sie beginnen?", "es": "¿Cuándo te gustaría empezar?", "fr": "Quand aimeriez-vous commencer?", "it": "Quando vorresti iniziare?"}',
    'single',
    '[
        {"value": "asap", "label": {"en": "As soon as possible", "de": "So bald wie möglich", "es": "Lo antes posible", "fr": "Dès que possible", "it": "Il prima possibile"}, "icon": "🚀"},
        {"value": "this_week", "label": {"en": "This week", "de": "Diese Woche", "es": "Esta semana", "fr": "Cette semaine", "it": "Questa settimana"}, "icon": "📅"},
        {"value": "this_month", "label": {"en": "Within a month", "de": "Innerhalb eines Monats", "es": "Dentro de un mes", "fr": "Dans le mois", "it": "Entro un mese"}, "icon": "📆"},
        {"value": "exploring", "label": {"en": "Just exploring", "de": "Nur erkunden", "es": "Solo explorando", "fr": "Juste en exploration", "it": "Sto solo esplorando"}, "icon": "🔍"}
    ]',
    8,
    '{"type": "urgency_indicator"}'
)
ON CONFLICT (question_key) DO NOTHING;

-- =============================================
-- SPECIALTY CATEGORIES (for filtering)
-- =============================================
CREATE TABLE IF NOT EXISTS cs_specialty_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name JSONB NOT NULL, -- {en: "...", de: "...", etc.}
    icon TEXT,
    parent_id UUID REFERENCES cs_specialty_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- SEO fields
    meta_title JSONB,
    meta_description JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default specialty categories
INSERT INTO cs_specialty_categories (slug, name, icon, sort_order) VALUES
('executive', '{"en": "Executive Coaching", "de": "Executive Coaching", "es": "Coaching Ejecutivo", "fr": "Coaching Exécutif", "it": "Coaching Esecutivo"}', '👔', 1),
('career', '{"en": "Career Coaching", "de": "Karriere-Coaching", "es": "Coaching de Carrera", "fr": "Coaching de Carrière", "it": "Coaching di Carriera"}', '💼', 2),
('life', '{"en": "Life Coaching", "de": "Life Coaching", "es": "Coaching de Vida", "fr": "Coaching de Vie", "it": "Life Coaching"}', '🌟', 3),
('health', '{"en": "Health & Wellness", "de": "Gesundheit & Wellness", "es": "Salud y Bienestar", "fr": "Santé et Bien-être", "it": "Salute e Benessere"}', '🏃', 4),
('business', '{"en": "Business Coaching", "de": "Business Coaching", "es": "Coaching Empresarial", "fr": "Coaching Business", "it": "Business Coaching"}', '📈', 5),
('leadership', '{"en": "Leadership", "de": "Führung", "es": "Liderazgo", "fr": "Leadership", "it": "Leadership"}', '🎯', 6),
('mindset', '{"en": "Mindset & Performance", "de": "Mindset & Leistung", "es": "Mentalidad y Rendimiento", "fr": "Mentalité et Performance", "it": "Mindset e Performance"}', '🧠', 7),
('relationships', '{"en": "Relationships", "de": "Beziehungen", "es": "Relaciones", "fr": "Relations", "it": "Relazioni"}', '❤️', 8)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- LOCATION DATA (for geo search)
-- =============================================
CREATE TABLE IF NOT EXISTS cs_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city TEXT NOT NULL,
    region TEXT,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone TEXT,

    -- SEO fields
    slug TEXT UNIQUE,
    meta_title JSONB,
    meta_description JSONB,

    -- Coach count for display
    coach_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert major European cities
INSERT INTO cs_locations (city, country, country_code, slug, latitude, longitude) VALUES
('Berlin', 'Germany', 'DE', 'berlin', 52.5200, 13.4050),
('Munich', 'Germany', 'DE', 'munich', 48.1351, 11.5820),
('Hamburg', 'Germany', 'DE', 'hamburg', 53.5511, 9.9937),
('Frankfurt', 'Germany', 'DE', 'frankfurt', 50.1109, 8.6821),
('London', 'United Kingdom', 'GB', 'london', 51.5074, -0.1278),
('Paris', 'France', 'FR', 'paris', 48.8566, 2.3522),
('Amsterdam', 'Netherlands', 'NL', 'amsterdam', 52.3676, 4.9041),
('Zurich', 'Switzerland', 'CH', 'zurich', 47.3769, 8.5417),
('Vienna', 'Austria', 'AT', 'vienna', 48.2082, 16.3738),
('Milan', 'Italy', 'IT', 'milan', 45.4642, 9.1900),
('Madrid', 'Spain', 'ES', 'madrid', 40.4168, -3.7038),
('Barcelona', 'Spain', 'ES', 'barcelona', 41.3851, 2.1734),
('Brussels', 'Belgium', 'BE', 'brussels', 50.8503, 4.3517),
('Dublin', 'Ireland', 'IE', 'dublin', 53.3498, -6.2603),
('Stockholm', 'Sweden', 'SE', 'stockholm', 59.3293, 18.0686),
('Copenhagen', 'Denmark', 'DK', 'copenhagen', 55.6761, 12.5683),
('Oslo', 'Norway', 'NO', 'oslo', 59.9139, 10.7522),
('Helsinki', 'Finland', 'FI', 'helsinki', 60.1699, 24.9384),
('Lisbon', 'Portugal', 'PT', 'lisbon', 38.7223, -9.1393),
('Prague', 'Czech Republic', 'CZ', 'prague', 50.0755, 14.4378)
ON CONFLICT (slug) DO NOTHING;

-- Create index for geo queries
CREATE INDEX IF NOT EXISTS idx_locations_coords ON cs_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_country ON cs_locations(country_code);

-- =============================================
-- SEARCH SUGGESTIONS (autocomplete)
-- =============================================
CREATE TABLE IF NOT EXISTS cs_search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term TEXT NOT NULL,
    type TEXT NOT NULL, -- 'specialty', 'location', 'coach_name', 'keyword'
    weight INTEGER DEFAULT 0, -- For ranking suggestions
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_term ON cs_search_suggestions(term);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_type ON cs_search_suggestions(type);

-- =============================================
-- TRIGGER: Update coach_count in locations
-- =============================================
CREATE OR REPLACE FUNCTION update_location_coach_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cs_locations
    SET coach_count = (
        SELECT COUNT(*) FROM cs_coaches
        WHERE city ILIKE cs_locations.city
        AND onboarding_completed = true
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_location_counts ON cs_coaches;
CREATE TRIGGER trigger_update_location_counts
AFTER INSERT OR UPDATE OR DELETE ON cs_coaches
FOR EACH STATEMENT
EXECUTE FUNCTION update_location_coach_count();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Quiz responses: users can only see their own
ALTER TABLE cs_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz responses" ON cs_quiz_responses
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert quiz responses" ON cs_quiz_responses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own quiz responses" ON cs_quiz_responses
    FOR UPDATE USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));

-- Search events: insert only, no read for users
ALTER TABLE cs_search_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search events" ON cs_search_events
    FOR INSERT WITH CHECK (true);

-- Concierge requests: users can view/create their own
ALTER TABLE cs_concierge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own concierge requests" ON cs_concierge_requests
    FOR SELECT USING (auth.uid() = user_id OR email = current_setting('app.user_email', true));

CREATE POLICY "Anyone can create concierge requests" ON cs_concierge_requests
    FOR INSERT WITH CHECK (true);

-- Quiz questions: public read
ALTER TABLE cs_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quiz questions" ON cs_quiz_questions
    FOR SELECT USING (is_active = true);

-- Specialty categories: public read
ALTER TABLE cs_specialty_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read specialty categories" ON cs_specialty_categories
    FOR SELECT USING (is_active = true);

-- Locations: public read
ALTER TABLE cs_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read locations" ON cs_locations
    FOR SELECT USING (true);

-- Search suggestions: public read
ALTER TABLE cs_search_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read search suggestions" ON cs_search_suggestions
    FOR SELECT USING (true);

-- =============================================
-- MATCHING ALGORITHM FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION calculate_coach_match_score(
    coach_row cs_coaches,
    quiz_answers JSONB
) RETURNS NUMERIC AS $$
DECLARE
    score NUMERIC := 0;
    max_score NUMERIC := 100;
    goal_match BOOLEAN := false;
    budget_match BOOLEAN := false;
    location_match BOOLEAN := false;
    language_match BOOLEAN := false;
    session_match BOOLEAN := false;
    importance_weights JSONB;
BEGIN
    -- Goal/Specialty Match (25 points base)
    IF quiz_answers ? 'goal' THEN
        IF coach_row.specialties @> ARRAY[quiz_answers->>'goal'] THEN
            score := score + 25;
            goal_match := true;
        ELSIF coach_row.specialties && ARRAY[
            CASE quiz_answers->>'goal'
                WHEN 'career' THEN 'Career Coaching'
                WHEN 'leadership' THEN 'Leadership'
                WHEN 'life' THEN 'Life Coaching'
                WHEN 'health' THEN 'Health & Wellness'
                WHEN 'business' THEN 'Business Coaching'
                WHEN 'relationships' THEN 'Relationship Coaching'
                ELSE quiz_answers->>'goal'
            END
        ] THEN
            score := score + 20;
            goal_match := true;
        END IF;
    END IF;

    -- Budget Match (20 points)
    IF quiz_answers ? 'budget' THEN
        CASE quiz_answers->>'budget'
            WHEN 'under_50' THEN
                IF coach_row.hourly_rate <= 50 THEN score := score + 20; budget_match := true; END IF;
            WHEN '50_100' THEN
                IF coach_row.hourly_rate BETWEEN 50 AND 100 THEN score := score + 20; budget_match := true; END IF;
            WHEN '100_200' THEN
                IF coach_row.hourly_rate BETWEEN 100 AND 200 THEN score := score + 20; budget_match := true; END IF;
            WHEN '200_plus' THEN
                IF coach_row.hourly_rate >= 200 THEN score := score + 20; budget_match := true; END IF;
        END CASE;
    END IF;

    -- Session Type Match (15 points)
    IF quiz_answers ? 'session_type' THEN
        IF quiz_answers->>'session_type' = 'both' THEN
            score := score + 15;
            session_match := true;
        ELSIF coach_row.session_types @> ARRAY[quiz_answers->>'session_type'] THEN
            score := score + 15;
            session_match := true;
        END IF;
    END IF;

    -- Language Match (15 points)
    IF quiz_answers ? 'language' THEN
        IF coach_row.languages && ARRAY(SELECT jsonb_array_elements_text(quiz_answers->'language')) THEN
            score := score + 15;
            language_match := true;
        END IF;
    END IF;

    -- Trust Score Bonus (up to 15 points)
    score := score + (COALESCE(coach_row.trust_score, 0) / 100.0 * 15);

    -- Video Introduction Bonus (5 points)
    IF coach_row.video_intro_url IS NOT NULL THEN
        score := score + 5;
    END IF;

    -- Rating Bonus (up to 5 points)
    IF coach_row.rating_average IS NOT NULL AND coach_row.rating_average > 0 THEN
        score := score + (coach_row.rating_average / 5.0 * 5);
    END IF;

    -- Apply importance weights
    IF quiz_answers ? 'importance' THEN
        importance_weights := quiz_answers->'importance';

        IF importance_weights ? 'credentials' AND coach_row.trust_score >= 60 THEN
            score := score * 1.1;
        END IF;

        IF importance_weights ? 'experience' AND coach_row.years_experience >= 5 THEN
            score := score * 1.1;
        END IF;

        IF importance_weights ? 'reviews' AND coach_row.rating_count >= 5 THEN
            score := score * 1.1;
        END IF;

        IF importance_weights ? 'video' AND coach_row.video_intro_url IS NOT NULL THEN
            score := score * 1.15;
        END IF;
    END IF;

    -- Cap at max score
    RETURN LEAST(score, max_score);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- FUNCTION: Get matched coaches for quiz
-- =============================================
CREATE OR REPLACE FUNCTION get_quiz_matched_coaches(
    quiz_answers JSONB,
    limit_count INTEGER DEFAULT 10
) RETURNS TABLE (
    coach_id UUID,
    match_score NUMERIC,
    coach_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as coach_id,
        calculate_coach_match_score(c, quiz_answers) as match_score,
        to_jsonb(c) as coach_data
    FROM cs_coaches c
    WHERE c.onboarding_completed = true
    ORDER BY
        calculate_coach_match_score(c, quiz_answers) DESC,
        c.video_intro_url IS NOT NULL DESC,
        c.trust_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE cs_quiz_responses IS 'Stores user quiz responses and matching results for the guided discovery flow';
COMMENT ON TABLE cs_search_events IS 'Analytics table for search behavior and conversion tracking';
COMMENT ON TABLE cs_concierge_requests IS 'Human-assisted matching requests for complex coaching needs';
COMMENT ON TABLE cs_quiz_questions IS 'Dynamic quiz question configuration with multilingual support';
COMMENT ON TABLE cs_specialty_categories IS 'Coaching specialty categories for filtering and SEO';
COMMENT ON TABLE cs_locations IS 'Location data for geo-based search and SEO landing pages';
COMMENT ON FUNCTION calculate_coach_match_score IS 'Calculates match score between a coach and quiz answers';
COMMENT ON FUNCTION get_quiz_matched_coaches IS 'Returns coaches ranked by match score for given quiz answers';
