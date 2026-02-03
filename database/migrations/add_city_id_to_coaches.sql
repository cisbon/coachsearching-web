-- ============================================================================
-- Migration: Add city_id foreign key to cs_coaches
-- This replaces location_city/location_country with a reference to cs_cities.id
-- ============================================================================

-- Step 1: Add the city_id column (nullable initially for migration)
ALTER TABLE cs_coaches
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cs_cities(id);

-- Step 2: Create an index on city_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_cs_coaches_city_id ON cs_coaches(city_id);

-- Step 3: Populate city_id by matching existing location_city values
-- This matches against all language variants in cs_cities (name_en, name_de, name_fr, name_es, name_it)
UPDATE cs_coaches c
SET city_id = matched_city.id
FROM (
    SELECT DISTINCT ON (coach_id)
           co.id as coach_id,
           ci.id as id
    FROM cs_coaches co
    CROSS JOIN cs_cities ci
    WHERE co.location_city IS NOT NULL
      AND co.location_city != ''
      AND (
          -- Match against English name
          LOWER(TRIM(co.location_city)) = LOWER(TRIM(ci.name_en))
          -- Match against German name (handles München -> Munich)
          OR LOWER(TRIM(co.location_city)) = LOWER(TRIM(ci.name_de))
          -- Match against French name
          OR LOWER(TRIM(co.location_city)) = LOWER(TRIM(ci.name_fr))
          -- Match against Spanish name
          OR LOWER(TRIM(co.location_city)) = LOWER(TRIM(ci.name_es))
          -- Match against Italian name
          OR LOWER(TRIM(co.location_city)) = LOWER(TRIM(ci.name_it))
          -- Also match against the code (e.g., 'munich', 'berlin')
          OR LOWER(TRIM(co.location_city)) = LOWER(ci.code)
      )
      -- Additional country validation if available
      AND (
          co.location_country IS NULL
          OR co.location_country = ''
          OR LOWER(TRIM(co.location_country)) = LOWER(TRIM(ci.country_en))
      )
    ORDER BY coach_id, ci.tier ASC, ci.sort_order ASC  -- Prefer lower tier (more important cities) on ties
) AS matched_city
WHERE c.id = matched_city.coach_id;

-- Step 4: Add a comment explaining the column
COMMENT ON COLUMN cs_coaches.city_id IS 'Foreign key reference to cs_cities.id - the coach''s location city';

-- Step 5: Verify the migration - show coaches with their matched cities
-- SELECT
--     c.id,
--     c.full_name,
--     c.location_city as old_city,
--     c.location_country as old_country,
--     c.city_id,
--     ci.name_en as new_city_en,
--     ci.name_de as new_city_de,
--     ci.country_en as new_country
-- FROM cs_coaches c
-- LEFT JOIN cs_cities ci ON c.city_id = ci.id
-- ORDER BY c.created_at DESC;

-- Step 6: Summary statistics
SELECT
    COUNT(*) as total_coaches,
    COUNT(city_id) as coaches_with_city_id,
    COUNT(*) - COUNT(city_id) as coaches_without_city_id,
    ROUND(COUNT(city_id)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as match_percentage
FROM cs_coaches;

-- ============================================================================
-- IMPORTANT: Do NOT drop the old columns yet!
-- Keep location_city and location_country as backup during transition.
-- After verifying the migration works correctly, you can optionally drop them:
--
-- ALTER TABLE cs_coaches DROP COLUMN IF EXISTS location_city;
-- ALTER TABLE cs_coaches DROP COLUMN IF EXISTS location_country;
-- ============================================================================
