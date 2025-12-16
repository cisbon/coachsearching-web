-- Migration: Fix slug generation to properly lowercase title
-- Date: 2024-12-16
-- Description: Fixes bug where title wasn't lowercased, causing uppercase letters to be stripped

-- Update the function to lowercase the title before appending
CREATE OR REPLACE FUNCTION generate_coach_slug(full_name TEXT, title TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Create base slug from name (lowercased)
    base_slug := lower(full_name);

    -- Add title if provided (take first 30 chars max, LOWERCASED)
    IF title IS NOT NULL AND title != '' THEN
        base_slug := base_slug || ' ' || lower(left(title, 30));
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

-- Regenerate all slugs with the fixed function
-- First, temporarily allow NULL slugs
ALTER TABLE cs_coaches ALTER COLUMN slug DROP NOT NULL;

-- Clear all existing slugs so they get regenerated fresh
UPDATE cs_coaches SET slug = NULL;

-- Regenerate all slugs
UPDATE cs_coaches
SET slug = generate_coach_slug(
    COALESCE(full_name, 'coach'),
    title
);

-- Restore NOT NULL constraint
ALTER TABLE cs_coaches ALTER COLUMN slug SET NOT NULL;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Coach slugs have been regenerated with proper lowercase handling';
END $$;
