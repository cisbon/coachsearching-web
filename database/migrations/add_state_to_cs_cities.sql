-- ============================================================================
-- Add state column to cs_cities table and populate with ISO 3166-2 state codes
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Add the state column if it doesn't exist
ALTER TABLE cs_cities
ADD COLUMN IF NOT EXISTS state VARCHAR(10);

-- Step 2: Add an index for state lookups
CREATE INDEX IF NOT EXISTS idx_cs_cities_state ON cs_cities(state);

-- Step 3: Update all cities with their correct state/region codes
-- Using ISO 3166-2 format: {country_code}-{state_code}

-- ============================================================================
-- GERMANY (DE) - German States (Bundesländer)
-- ============================================================================
UPDATE cs_cities SET state = 'DE-BE' WHERE code = 'berlin';           -- Berlin
UPDATE cs_cities SET state = 'DE-BY' WHERE code = 'munich';           -- Bayern (Bavaria)
UPDATE cs_cities SET state = 'DE-HH' WHERE code = 'hamburg';          -- Hamburg
UPDATE cs_cities SET state = 'DE-HE' WHERE code = 'frankfurt';        -- Hessen
UPDATE cs_cities SET state = 'DE-NW' WHERE code = 'dusseldorf';       -- Nordrhein-Westfalen
UPDATE cs_cities SET state = 'DE-NW' WHERE code = 'cologne';          -- Nordrhein-Westfalen
UPDATE cs_cities SET state = 'DE-BW' WHERE code = 'stuttgart';        -- Baden-Württemberg
UPDATE cs_cities SET state = 'DE-NI' WHERE code = 'hanover';          -- Niedersachsen
UPDATE cs_cities SET state = 'DE-BY' WHERE code = 'nuremberg';        -- Bayern (Bavaria)
UPDATE cs_cities SET state = 'DE-SN' WHERE code = 'leipzig';          -- Sachsen
UPDATE cs_cities SET state = 'DE-SN' WHERE code = 'dresden';          -- Sachsen
UPDATE cs_cities SET state = 'DE-NW' WHERE code = 'bonn';             -- Nordrhein-Westfalen
UPDATE cs_cities SET state = 'DE-NW' WHERE code = 'essen';            -- Nordrhein-Westfalen
UPDATE cs_cities SET state = 'DE-NW' WHERE code = 'dortmund';         -- Nordrhein-Westfalen
UPDATE cs_cities SET state = 'DE-HB' WHERE code = 'bremen';           -- Bremen
UPDATE cs_cities SET state = 'DE-NW' WHERE code = 'duisburg';         -- Nordrhein-Westfalen
UPDATE cs_cities SET state = 'DE-NW' WHERE code = 'munster';          -- Nordrhein-Westfalen
UPDATE cs_cities SET state = 'DE-BW' WHERE code = 'karlsruhe';        -- Baden-Württemberg
UPDATE cs_cities SET state = 'DE-BW' WHERE code = 'mannheim';         -- Baden-Württemberg
UPDATE cs_cities SET state = 'DE-BY' WHERE code = 'augsburg';         -- Bayern (Bavaria)
UPDATE cs_cities SET state = 'DE-HE' WHERE code = 'wiesbaden';        -- Hessen
UPDATE cs_cities SET state = 'DE-BW' WHERE code = 'freiburg';         -- Baden-Württemberg

-- ============================================================================
-- AUSTRIA (AT) - Austrian States (Bundesländer)
-- ============================================================================
UPDATE cs_cities SET state = 'AT-9' WHERE code = 'vienna';            -- Wien

-- ============================================================================
-- SWITZERLAND (CH) - Swiss Cantons
-- ============================================================================
UPDATE cs_cities SET state = 'CH-ZH' WHERE code = 'zurich';           -- Zürich
UPDATE cs_cities SET state = 'CH-GE' WHERE code = 'geneva';           -- Genève
UPDATE cs_cities SET state = 'CH-BS' WHERE code = 'basel';            -- Basel-Stadt

-- ============================================================================
-- NETHERLANDS (NL) - Dutch Provinces
-- ============================================================================
UPDATE cs_cities SET state = 'NL-NH' WHERE code = 'amsterdam';        -- Noord-Holland
UPDATE cs_cities SET state = 'NL-ZH' WHERE code = 'rotterdam';        -- Zuid-Holland
UPDATE cs_cities SET state = 'NL-ZH' WHERE code = 'the-hague';        -- Zuid-Holland

-- ============================================================================
-- BELGIUM (BE) - Belgian Regions
-- ============================================================================
UPDATE cs_cities SET state = 'BE-BRU' WHERE code = 'brussels';        -- Brussels Capital Region
UPDATE cs_cities SET state = 'BE-VAN' WHERE code = 'antwerp';         -- Antwerp (Flanders)

-- ============================================================================
-- UNITED KINGDOM (GB) - UK Countries/Regions
-- ============================================================================
UPDATE cs_cities SET state = 'GB-ENG' WHERE code = 'london';          -- England
UPDATE cs_cities SET state = 'GB-ENG' WHERE code = 'manchester';      -- England
UPDATE cs_cities SET state = 'GB-ENG' WHERE code = 'birmingham';      -- England
UPDATE cs_cities SET state = 'GB-SCT' WHERE code = 'edinburgh';       -- Scotland

-- ============================================================================
-- IRELAND (IE) - Irish Provinces
-- ============================================================================
UPDATE cs_cities SET state = 'IE-D' WHERE code = 'dublin';            -- Dublin (Leinster)

-- ============================================================================
-- SWEDEN (SE) - Swedish Counties
-- ============================================================================
UPDATE cs_cities SET state = 'SE-AB' WHERE code = 'stockholm';        -- Stockholm
UPDATE cs_cities SET state = 'SE-O' WHERE code = 'gothenburg';        -- Västra Götaland
UPDATE cs_cities SET state = 'SE-M' WHERE code = 'malmo';             -- Skåne

-- ============================================================================
-- DENMARK (DK) - Danish Regions
-- ============================================================================
UPDATE cs_cities SET state = 'DK-84' WHERE code = 'copenhagen';       -- Hovedstaden

-- ============================================================================
-- NORWAY (NO) - Norwegian Counties
-- ============================================================================
UPDATE cs_cities SET state = 'NO-03' WHERE code = 'oslo';             -- Oslo

-- ============================================================================
-- FINLAND (FI) - Finnish Regions
-- ============================================================================
UPDATE cs_cities SET state = 'FI-18' WHERE code = 'helsinki';         -- Uusimaa

-- ============================================================================
-- FRANCE (FR) - French Regions
-- ============================================================================
UPDATE cs_cities SET state = 'FR-IDF' WHERE code = 'paris';           -- Île-de-France
UPDATE cs_cities SET state = 'FR-ARA' WHERE code = 'lyon';            -- Auvergne-Rhône-Alpes

-- ============================================================================
-- SPAIN (ES) - Spanish Autonomous Communities
-- ============================================================================
UPDATE cs_cities SET state = 'ES-MD' WHERE code = 'madrid';           -- Comunidad de Madrid
UPDATE cs_cities SET state = 'ES-CT' WHERE code = 'barcelona';        -- Cataluña
UPDATE cs_cities SET state = 'ES-VC' WHERE code = 'valencia';         -- Comunidad Valenciana

-- ============================================================================
-- ITALY (IT) - Italian Regions
-- ============================================================================
UPDATE cs_cities SET state = 'IT-25' WHERE code = 'milan';            -- Lombardia
UPDATE cs_cities SET state = 'IT-62' WHERE code = 'rome';             -- Lazio

-- ============================================================================
-- POLAND (PL) - Polish Voivodeships
-- ============================================================================
UPDATE cs_cities SET state = 'PL-MZ' WHERE code = 'warsaw';           -- Mazowieckie
UPDATE cs_cities SET state = 'PL-MA' WHERE code = 'krakow';           -- Małopolskie
UPDATE cs_cities SET state = 'PL-DS' WHERE code = 'wroclaw';          -- Dolnośląskie

-- ============================================================================
-- CZECH REPUBLIC (CZ) - Czech Regions
-- ============================================================================
UPDATE cs_cities SET state = 'CZ-10' WHERE code = 'prague';           -- Praha

-- ============================================================================
-- PORTUGAL (PT) - Portuguese Districts
-- ============================================================================
UPDATE cs_cities SET state = 'PT-11' WHERE code = 'lisbon';           -- Lisboa
UPDATE cs_cities SET state = 'PT-13' WHERE code = 'porto';            -- Porto

-- ============================================================================
-- HUNGARY (HU) - Hungarian Counties
-- ============================================================================
UPDATE cs_cities SET state = 'HU-BU' WHERE code = 'budapest';         -- Budapest

-- ============================================================================
-- ROMANIA (RO) - Romanian Counties
-- ============================================================================
UPDATE cs_cities SET state = 'RO-B' WHERE code = 'bucharest';         -- București

-- ============================================================================
-- GREECE (GR) - Greek Regions
-- ============================================================================
UPDATE cs_cities SET state = 'GR-I' WHERE code = 'athens';            -- Attica

-- ============================================================================
-- LUXEMBOURG (LU) - Luxembourg (single state)
-- ============================================================================
UPDATE cs_cities SET state = 'LU-LU' WHERE code = 'luxembourg';       -- Luxembourg

-- ============================================================================
-- ESTONIA (EE) - Estonian Counties
-- ============================================================================
UPDATE cs_cities SET state = 'EE-37' WHERE code = 'tallinn';          -- Harju

-- ============================================================================
-- USA (US) - If any US cities are added later
-- ============================================================================
-- Examples for future US cities:
-- UPDATE cs_cities SET state = 'US-AL' WHERE code = 'birmingham-us'; -- Alabama
-- UPDATE cs_cities SET state = 'US-CA' WHERE code = 'los-angeles';   -- California
-- UPDATE cs_cities SET state = 'US-NY' WHERE code = 'new-york';      -- New York
-- UPDATE cs_cities SET state = 'US-TX' WHERE code = 'houston';       -- Texas

-- ============================================================================
-- Verify the update
-- ============================================================================
SELECT
    code,
    name_en,
    country_code,
    country_en,
    state,
    CASE
        WHEN state IS NULL THEN 'MISSING'
        ELSE 'OK'
    END as status
FROM cs_cities
ORDER BY country_code, state, name_en;

-- Show count summary
SELECT
    country_en,
    COUNT(*) as city_count,
    COUNT(state) as cities_with_state,
    COUNT(*) - COUNT(state) as missing_state
FROM cs_cities
GROUP BY country_en
ORDER BY country_en;
