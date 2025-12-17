-- Migration: Create cs_lookup_options table
-- Date: 2024-12-17
-- Description: Single table for all dropdown/filter options (specialties, languages, session formats)
--              with multi-language support

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cs_lookup_options (
    id serial PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('specialty', 'language', 'session_format')),
    code text NOT NULL,
    name_en text NOT NULL,
    name_de text,
    name_fr text,
    name_es text,
    name_it text,
    icon text,
    description_en text,
    description_de text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_lookup_options_type_code_unique UNIQUE (type, code)
);

-- Create index for fast lookups by type
CREATE INDEX IF NOT EXISTS idx_cs_lookup_options_type ON public.cs_lookup_options(type);
CREATE INDEX IF NOT EXISTS idx_cs_lookup_options_active ON public.cs_lookup_options(type, is_active);

-- ============================================================================
-- 2. INSERT SPECIALTIES
-- ============================================================================

INSERT INTO public.cs_lookup_options (type, code, name_en, name_de, name_fr, name_es, name_it, icon, sort_order) VALUES
-- Life & Personal
('specialty', 'life-coaching', 'Life Coaching', 'Life Coaching', 'Coaching de vie', 'Coaching de vida', 'Life Coaching', '🌟', 1),
('specialty', 'mindset-coaching', 'Mindset Coaching', 'Mindset Coaching', 'Coaching mental', 'Coaching de mentalidad', 'Coaching della mentalità', '🧠', 2),
('specialty', 'stress-management', 'Stress Management', 'Stressmanagement', 'Gestion du stress', 'Gestión del estrés', 'Gestione dello stress', '🧘', 3),
('specialty', 'work-life-balance', 'Work-Life Balance', 'Work-Life-Balance', 'Équilibre travail-vie', 'Equilibrio trabajo-vida', 'Equilibrio lavoro-vita', '⚖️', 4),
('specialty', 'relationship-coaching', 'Relationship Coaching', 'Beziehungscoaching', 'Coaching relationnel', 'Coaching de relaciones', 'Coaching relazionale', '💕', 5),
('specialty', 'confidence-building', 'Confidence Building', 'Selbstvertrauen aufbauen', 'Développer la confiance', 'Construcción de confianza', 'Costruire la fiducia', '💪', 6),

-- Career & Professional
('specialty', 'career-coaching', 'Career Coaching', 'Karrierecoaching', 'Coaching de carrière', 'Coaching de carrera', 'Coaching di carriera', '📈', 10),
('specialty', 'executive-coaching', 'Executive Coaching', 'Executive Coaching', 'Coaching exécutif', 'Coaching ejecutivo', 'Executive Coaching', '👔', 11),
('specialty', 'leadership-development', 'Leadership Development', 'Führungskräfteentwicklung', 'Développement du leadership', 'Desarrollo de liderazgo', 'Sviluppo della leadership', '🎯', 12),
('specialty', 'business-coaching', 'Business Coaching', 'Business Coaching', 'Coaching d''entreprise', 'Coaching empresarial', 'Business Coaching', '💼', 13),
('specialty', 'entrepreneurship', 'Entrepreneurship', 'Unternehmertum', 'Entrepreneuriat', 'Emprendimiento', 'Imprenditorialità', '🚀', 14),
('specialty', 'performance-coaching', 'Performance Coaching', 'Performance Coaching', 'Coaching de performance', 'Coaching de rendimiento', 'Performance Coaching', '🏆', 15),

-- Health & Wellness
('specialty', 'health-wellness', 'Health & Wellness', 'Gesundheit & Wellness', 'Santé & Bien-être', 'Salud y Bienestar', 'Salute e Benessere', '🌿', 20),
('specialty', 'nutrition-coaching', 'Nutrition Coaching', 'Ernährungscoaching', 'Coaching nutritionnel', 'Coaching nutricional', 'Coaching nutrizionale', '🥗', 21),
('specialty', 'fitness-coaching', 'Fitness Coaching', 'Fitness Coaching', 'Coaching fitness', 'Coaching de fitness', 'Fitness Coaching', '🏋️', 22),
('specialty', 'sleep-coaching', 'Sleep Coaching', 'Schlafcoaching', 'Coaching du sommeil', 'Coaching del sueño', 'Coaching del sonno', '😴', 23),

-- Financial
('specialty', 'financial-coaching', 'Financial Coaching', 'Finanzcoaching', 'Coaching financier', 'Coaching financiero', 'Coaching finanziario', '💰', 30),

-- Specialized
('specialty', 'team-coaching', 'Team Coaching', 'Team Coaching', 'Coaching d''équipe', 'Coaching de equipos', 'Team Coaching', '👥', 40),
('specialty', 'conflict-resolution', 'Conflict Resolution', 'Konfliktlösung', 'Résolution de conflits', 'Resolución de conflictos', 'Risoluzione dei conflitti', '🤝', 41),
('specialty', 'communication-skills', 'Communication Skills', 'Kommunikationsfähigkeiten', 'Compétences en communication', 'Habilidades de comunicación', 'Competenze comunicative', '💬', 42),
('specialty', 'public-speaking', 'Public Speaking', 'Öffentliches Sprechen', 'Prise de parole en public', 'Oratoria', 'Public Speaking', '🎤', 43),
('specialty', 'time-management', 'Time Management', 'Zeitmanagement', 'Gestion du temps', 'Gestión del tiempo', 'Gestione del tempo', '⏰', 44),
('specialty', 'goal-setting', 'Goal Setting', 'Zielsetzung', 'Définition d''objectifs', 'Establecimiento de metas', 'Definizione degli obiettivi', '🎯', 45),
('specialty', 'transition-coaching', 'Life Transitions', 'Lebensübergänge', 'Transitions de vie', 'Transiciones de vida', 'Transizioni di vita', '🔄', 46),
('specialty', 'parenting-coaching', 'Parenting Coaching', 'Elterncoaching', 'Coaching parental', 'Coaching para padres', 'Coaching genitoriale', '👨‍👩‍👧', 47),
('specialty', 'dating-coaching', 'Dating & Singles', 'Dating & Singles', 'Rencontres & Célibataires', 'Citas y Solteros', 'Dating & Single', '❤️', 48)
ON CONFLICT (type, code) DO NOTHING;

-- ============================================================================
-- 3. INSERT LANGUAGES
-- ============================================================================

INSERT INTO public.cs_lookup_options (type, code, name_en, name_de, name_fr, name_es, name_it, icon, sort_order) VALUES
('language', 'en', 'English', 'Englisch', 'Anglais', 'Inglés', 'Inglese', '🇬🇧', 1),
('language', 'de', 'German', 'Deutsch', 'Allemand', 'Alemán', 'Tedesco', '🇩🇪', 2),
('language', 'fr', 'French', 'Französisch', 'Français', 'Francés', 'Francese', '🇫🇷', 3),
('language', 'es', 'Spanish', 'Spanisch', 'Espagnol', 'Español', 'Spagnolo', '🇪🇸', 4),
('language', 'it', 'Italian', 'Italienisch', 'Italien', 'Italiano', 'Italiano', '🇮🇹', 5),
('language', 'nl', 'Dutch', 'Niederländisch', 'Néerlandais', 'Holandés', 'Olandese', '🇳🇱', 6),
('language', 'pt', 'Portuguese', 'Portugiesisch', 'Portugais', 'Portugués', 'Portoghese', '🇵🇹', 7),
('language', 'pl', 'Polish', 'Polnisch', 'Polonais', 'Polaco', 'Polacco', '🇵🇱', 8),
('language', 'ru', 'Russian', 'Russisch', 'Russe', 'Ruso', 'Russo', '🇷🇺', 9),
('language', 'zh', 'Chinese', 'Chinesisch', 'Chinois', 'Chino', 'Cinese', '🇨🇳', 10),
('language', 'ja', 'Japanese', 'Japanisch', 'Japonais', 'Japonés', 'Giapponese', '🇯🇵', 11),
('language', 'ar', 'Arabic', 'Arabisch', 'Arabe', 'Árabe', 'Arabo', '🇸🇦', 12),
('language', 'hi', 'Hindi', 'Hindi', 'Hindi', 'Hindi', 'Hindi', '🇮🇳', 13),
('language', 'tr', 'Turkish', 'Türkisch', 'Turc', 'Turco', 'Turco', '🇹🇷', 14),
('language', 'ko', 'Korean', 'Koreanisch', 'Coréen', 'Coreano', 'Coreano', '🇰🇷', 15),
('language', 'sv', 'Swedish', 'Schwedisch', 'Suédois', 'Sueco', 'Svedese', '🇸🇪', 16),
('language', 'da', 'Danish', 'Dänisch', 'Danois', 'Danés', 'Danese', '🇩🇰', 17),
('language', 'no', 'Norwegian', 'Norwegisch', 'Norvégien', 'Noruego', 'Norvegese', '🇳🇴', 18),
('language', 'fi', 'Finnish', 'Finnisch', 'Finnois', 'Finlandés', 'Finlandese', '🇫🇮', 19),
('language', 'cs', 'Czech', 'Tschechisch', 'Tchèque', 'Checo', 'Ceco', '🇨🇿', 20),
('language', 'el', 'Greek', 'Griechisch', 'Grec', 'Griego', 'Greco', '🇬🇷', 21),
('language', 'he', 'Hebrew', 'Hebräisch', 'Hébreu', 'Hebreo', 'Ebraico', '🇮🇱', 22),
('language', 'uk', 'Ukrainian', 'Ukrainisch', 'Ukrainien', 'Ucraniano', 'Ucraino', '🇺🇦', 23),
('language', 'ro', 'Romanian', 'Rumänisch', 'Roumain', 'Rumano', 'Rumeno', '🇷🇴', 24),
('language', 'hu', 'Hungarian', 'Ungarisch', 'Hongrois', 'Húngaro', 'Ungherese', '🇭🇺', 25)
ON CONFLICT (type, code) DO NOTHING;

-- ============================================================================
-- 4. INSERT SESSION FORMATS
-- ============================================================================

INSERT INTO public.cs_lookup_options (type, code, name_en, name_de, name_fr, name_es, name_it, icon, description_en, description_de, sort_order) VALUES
('session_format', 'video', 'Video Call', 'Videoanruf', 'Appel vidéo', 'Videollamada', 'Videochiamata', '💻', 'Online via Zoom, Meet, or Teams', 'Online via Zoom, Meet oder Teams', 1),
('session_format', 'in-person', 'In-Person', 'Vor Ort', 'En personne', 'Presencial', 'Di persona', '🤝', 'Face-to-face meetings', 'Persönliche Treffen', 2),
('session_format', 'phone', 'Phone Call', 'Telefonat', 'Appel téléphonique', 'Llamada telefónica', 'Telefonata', '📞', 'Audio-only sessions', 'Nur Audio-Sitzungen', 3),
('session_format', 'chat', 'Chat/Messaging', 'Chat/Nachrichten', 'Chat/Messagerie', 'Chat/Mensajería', 'Chat/Messaggistica', '💬', 'Text-based coaching', 'Textbasiertes Coaching', 4),
('session_format', 'hybrid', 'Hybrid', 'Hybrid', 'Hybride', 'Híbrido', 'Ibrido', '🔄', 'Mix of online and in-person', 'Mix aus Online und Vor-Ort', 5)
ON CONFLICT (type, code) DO NOTHING;

-- ============================================================================
-- 5. RLS POLICIES (Public read access)
-- ============================================================================

ALTER TABLE public.cs_lookup_options ENABLE ROW LEVEL SECURITY;

-- Everyone can read active options
CREATE POLICY "Anyone can read active lookup options"
    ON public.cs_lookup_options
    FOR SELECT
    USING (is_active = true);

-- Only service role can insert/update/delete (admin only via Supabase dashboard)
CREATE POLICY "Service role can manage lookup options"
    ON public.cs_lookup_options
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.cs_lookup_options TO anon, authenticated;
GRANT ALL ON public.cs_lookup_options TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.cs_lookup_options_id_seq TO anon, authenticated;
