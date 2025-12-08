-- Migration: Add slug field to cs_coaches for SEO-friendly URLs
-- Date: 2024-12-08
-- Description: Adds a unique slug field to coaches for human-readable URLs like /coach/john-smith-life-coach

-- Add slug column
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Create unique index on slug (allows NULL for backwards compatibility during migration)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_coaches_slug ON cs_coaches(slug) WHERE slug IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cs_coaches_slug_lookup ON cs_coaches(slug);

-- Function to generate a slug from name and title
CREATE OR REPLACE FUNCTION generate_coach_slug(full_name TEXT, title TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Create base slug from name
    base_slug := lower(full_name);

    -- Add title if provided (take first 30 chars max)
    IF title IS NOT NULL AND title != '' THEN
        base_slug := base_slug || ' ' || left(title, 30);
    END IF;

    -- Replace special characters and spaces with hyphens
    base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);

    -- Limit length to 100 characters
    base_slug := left(base_slug, 100);

    final_slug := base_slug;

    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM cs_coaches WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for all existing coaches that don't have one
UPDATE cs_coaches
SET slug = generate_coach_slug(
    COALESCE(full_name, display_name, 'coach'),
    title
)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating existing records
ALTER TABLE cs_coaches
ALTER COLUMN slug SET NOT NULL;

-- Add trigger to auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION auto_generate_coach_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_coach_slug(
            COALESCE(NEW.full_name, NEW.display_name, 'coach'),
            NEW.title
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_coach_slug ON cs_coaches;
CREATE TRIGGER trigger_auto_coach_slug
    BEFORE INSERT ON cs_coaches
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_coach_slug();

-- Comment for documentation
COMMENT ON COLUMN cs_coaches.slug IS 'SEO-friendly URL slug, auto-generated from name and title';
