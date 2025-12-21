-- ============================================================================
-- Create cs_cities table for coaching locations
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create the cities table
CREATE TABLE IF NOT EXISTS cs_cities (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- URL slug (e.g., 'berlin', 'munich')
    name_en VARCHAR(100) NOT NULL,     -- English name
    name_de VARCHAR(100) NOT NULL,     -- German name
    name_fr VARCHAR(100) NOT NULL,     -- French name
    name_es VARCHAR(100) NOT NULL,     -- Spanish name
    name_it VARCHAR(100) NOT NULL,     -- Italian name
    country_code VARCHAR(2) NOT NULL,  -- ISO country code (e.g., 'DE', 'AT')
    country_en VARCHAR(100) NOT NULL,  -- Country name in English
    picture_url TEXT,                  -- Unsplash image URL
    sort_order INTEGER DEFAULT 0,      -- For ordering cities
    tier INTEGER DEFAULT 3,            -- City tier (1=major, 2=secondary, 3=other)
    is_active BOOLEAN DEFAULT true,    -- Soft delete flag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cs_cities_code ON cs_cities(code);
CREATE INDEX IF NOT EXISTS idx_cs_cities_country_code ON cs_cities(country_code);
CREATE INDEX IF NOT EXISTS idx_cs_cities_is_active ON cs_cities(is_active);
CREATE INDEX IF NOT EXISTS idx_cs_cities_sort_order ON cs_cities(sort_order);

-- Enable RLS
ALTER TABLE cs_cities ENABLE ROW LEVEL SECURITY;

-- Create read policy (anyone can read active cities)
CREATE POLICY "Allow read access to active cities"
    ON cs_cities FOR SELECT
    USING (is_active = true);

-- Create admin policy for full access
CREATE POLICY "Allow admin full access to cities"
    ON cs_cities FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM cs_users WHERE user_type = 'admin'
        )
    );

-- ============================================================================
-- INSERT ALL CITIES DATA
-- ============================================================================

INSERT INTO cs_cities (code, name_en, name_de, name_fr, name_es, name_it, country_code, country_en, picture_url, sort_order, tier)
VALUES
-- Tier 1 - DACH Major Cities (sort 1-20)
('berlin', 'Berlin', 'Berlin', 'Berlin', 'Berlín', 'Berlino', 'DE', 'Germany', 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=300&fit=crop', 1, 1),
('munich', 'Munich', 'München', 'Munich', 'Múnich', 'Monaco di Baviera', 'DE', 'Germany', 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&h=300&fit=crop', 2, 1),
('hamburg', 'Hamburg', 'Hamburg', 'Hambourg', 'Hamburgo', 'Amburgo', 'DE', 'Germany', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop', 3, 1),
('frankfurt', 'Frankfurt', 'Frankfurt', 'Francfort', 'Fráncfort', 'Francoforte', 'DE', 'Germany', 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=300&fit=crop', 4, 1),
('dusseldorf', 'Düsseldorf', 'Düsseldorf', 'Düsseldorf', 'Düsseldorf', 'Düsseldorf', 'DE', 'Germany', 'https://images.unsplash.com/photo-1577538926988-4e9684615a96?w=400&h=300&fit=crop', 5, 1),
('cologne', 'Cologne', 'Köln', 'Cologne', 'Colonia', 'Colonia', 'DE', 'Germany', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop', 6, 1),
('stuttgart', 'Stuttgart', 'Stuttgart', 'Stuttgart', 'Stuttgart', 'Stoccarda', 'DE', 'Germany', 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&h=300&fit=crop', 7, 1),
('hanover', 'Hanover', 'Hannover', 'Hanovre', 'Hanóver', 'Hannover', 'DE', 'Germany', 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=400&h=300&fit=crop', 8, 1),
('nuremberg', 'Nuremberg', 'Nürnberg', 'Nuremberg', 'Núremberg', 'Norimberga', 'DE', 'Germany', 'https://images.unsplash.com/photo-1577548093075-b7ae5e7c0b90?w=400&h=300&fit=crop', 9, 1),
('leipzig', 'Leipzig', 'Leipzig', 'Leipzig', 'Leipzig', 'Lipsia', 'DE', 'Germany', 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop', 10, 1),
('vienna', 'Vienna', 'Wien', 'Vienne', 'Viena', 'Vienna', 'AT', 'Austria', 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=300&fit=crop', 11, 1),
('zurich', 'Zurich', 'Zürich', 'Zurich', 'Zúrich', 'Zurigo', 'CH', 'Switzerland', 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400&h=300&fit=crop', 12, 1),
('geneva', 'Geneva', 'Genf', 'Genève', 'Ginebra', 'Ginevra', 'CH', 'Switzerland', 'https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=400&h=300&fit=crop', 13, 1),
('basel', 'Basel', 'Basel', 'Bâle', 'Basilea', 'Basilea', 'CH', 'Switzerland', 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&h=300&fit=crop', 14, 1),
('amsterdam', 'Amsterdam', 'Amsterdam', 'Amsterdam', 'Ámsterdam', 'Amsterdam', 'NL', 'Netherlands', 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop', 15, 1),
('rotterdam', 'Rotterdam', 'Rotterdam', 'Rotterdam', 'Róterdam', 'Rotterdam', 'NL', 'Netherlands', 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop', 16, 1),
('the-hague', 'The Hague', 'Den Haag', 'La Haye', 'La Haya', 'L''Aia', 'NL', 'Netherlands', 'https://images.unsplash.com/photo-1582654454409-778c732f8a72?w=400&h=300&fit=crop', 17, 1),
('brussels', 'Brussels', 'Brüssel', 'Bruxelles', 'Bruselas', 'Bruxelles', 'BE', 'Belgium', 'https://images.unsplash.com/photo-1559113202-c916b8e44373?w=400&h=300&fit=crop', 18, 1),

-- Tier 2 - UK, Ireland, Nordics (sort 21-35)
('london', 'London', 'London', 'Londres', 'Londres', 'Londra', 'GB', 'United Kingdom', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop', 21, 2),
('manchester', 'Manchester', 'Manchester', 'Manchester', 'Mánchester', 'Manchester', 'GB', 'United Kingdom', 'https://images.unsplash.com/photo-1520120322929-60bb06f7f295?w=400&h=300&fit=crop', 22, 2),
('birmingham', 'Birmingham', 'Birmingham', 'Birmingham', 'Birmingham', 'Birmingham', 'GB', 'United Kingdom', 'https://images.unsplash.com/photo-1570095035965-2d7e8a6c95e4?w=400&h=300&fit=crop', 23, 2),
('edinburgh', 'Edinburgh', 'Edinburgh', 'Édimbourg', 'Edimburgo', 'Edimburgo', 'GB', 'United Kingdom', 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=400&h=300&fit=crop', 24, 2),
('dublin', 'Dublin', 'Dublin', 'Dublin', 'Dublín', 'Dublino', 'IE', 'Ireland', 'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=400&h=300&fit=crop', 25, 2),
('stockholm', 'Stockholm', 'Stockholm', 'Stockholm', 'Estocolmo', 'Stoccolma', 'SE', 'Sweden', 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=400&h=300&fit=crop', 26, 2),
('copenhagen', 'Copenhagen', 'Kopenhagen', 'Copenhague', 'Copenhague', 'Copenaghen', 'DK', 'Denmark', 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=400&h=300&fit=crop', 27, 2),
('oslo', 'Oslo', 'Oslo', 'Oslo', 'Oslo', 'Oslo', 'NO', 'Norway', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=300&fit=crop', 28, 2),
('helsinki', 'Helsinki', 'Helsinki', 'Helsinki', 'Helsinki', 'Helsinki', 'FI', 'Finland', 'https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?w=400&h=300&fit=crop', 29, 2),
('antwerp', 'Antwerp', 'Antwerpen', 'Anvers', 'Amberes', 'Anversa', 'BE', 'Belgium', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', 30, 2),
('gothenburg', 'Gothenburg', 'Göteborg', 'Göteborg', 'Gotemburgo', 'Göteborg', 'SE', 'Sweden', 'https://images.unsplash.com/photo-1572862031783-db05c67a5107?w=400&h=300&fit=crop', 31, 2),
('malmo', 'Malmö', 'Malmö', 'Malmö', 'Malmö', 'Malmö', 'SE', 'Sweden', 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop', 32, 2),

-- Tier 3 - Southern & Eastern Europe (sort 41-60)
('paris', 'Paris', 'Paris', 'Paris', 'París', 'Parigi', 'FR', 'France', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop', 41, 2),
('lyon', 'Lyon', 'Lyon', 'Lyon', 'Lyon', 'Lione', 'FR', 'France', 'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=400&h=300&fit=crop', 42, 2),
('madrid', 'Madrid', 'Madrid', 'Madrid', 'Madrid', 'Madrid', 'ES', 'Spain', 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop', 43, 2),
('barcelona', 'Barcelona', 'Barcelona', 'Barcelone', 'Barcelona', 'Barcellona', 'ES', 'Spain', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop', 44, 2),
('valencia', 'Valencia', 'Valencia', 'Valence', 'Valencia', 'Valencia', 'ES', 'Spain', 'https://images.unsplash.com/photo-1599302592205-d7d683c83eea?w=400&h=300&fit=crop', 45, 2),
('milan', 'Milan', 'Mailand', 'Milan', 'Milán', 'Milano', 'IT', 'Italy', 'https://images.unsplash.com/photo-1520440229-6469a149ac59?w=400&h=300&fit=crop', 46, 2),
('rome', 'Rome', 'Rom', 'Rome', 'Roma', 'Roma', 'IT', 'Italy', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop', 47, 2),
('warsaw', 'Warsaw', 'Warschau', 'Varsovie', 'Varsovia', 'Varsavia', 'PL', 'Poland', 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=400&h=300&fit=crop', 48, 2),
('krakow', 'Krakow', 'Krakau', 'Cracovie', 'Cracovia', 'Cracovia', 'PL', 'Poland', 'https://images.unsplash.com/photo-1574236170880-fae530dfa5c9?w=400&h=300&fit=crop', 49, 2),
('wroclaw', 'Wrocław', 'Breslau', 'Wrocław', 'Breslavia', 'Breslavia', 'PL', 'Poland', 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=400&h=300&fit=crop', 50, 2),
('prague', 'Prague', 'Prag', 'Prague', 'Praga', 'Praga', 'CZ', 'Czech Republic', 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=300&fit=crop', 51, 2),
('lisbon', 'Lisbon', 'Lissabon', 'Lisbonne', 'Lisboa', 'Lisbona', 'PT', 'Portugal', 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=300&fit=crop', 52, 2),
('porto', 'Porto', 'Porto', 'Porto', 'Oporto', 'Porto', 'PT', 'Portugal', 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=300&fit=crop', 53, 2),
('budapest', 'Budapest', 'Budapest', 'Budapest', 'Budapest', 'Budapest', 'HU', 'Hungary', 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=300&fit=crop', 54, 2),
('bucharest', 'Bucharest', 'Bukarest', 'Bucarest', 'Bucarest', 'Bucarest', 'RO', 'Romania', 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=400&h=300&fit=crop', 55, 2),
('athens', 'Athens', 'Athen', 'Athènes', 'Atenas', 'Atene', 'GR', 'Greece', 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=300&fit=crop', 56, 2),
('luxembourg', 'Luxembourg', 'Luxemburg', 'Luxembourg', 'Luxemburgo', 'Lussemburgo', 'LU', 'Luxembourg', 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400&h=300&fit=crop', 57, 2),
('tallinn', 'Tallinn', 'Tallinn', 'Tallinn', 'Tallin', 'Tallinn', 'EE', 'Estonia', 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400&h=300&fit=crop', 58, 2),

-- Tier 4 - German Secondary Cities (sort 61-80)
('dresden', 'Dresden', 'Dresden', 'Dresde', 'Dresde', 'Dresda', 'DE', 'Germany', 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=300&fit=crop', 61, 3),
('bonn', 'Bonn', 'Bonn', 'Bonn', 'Bonn', 'Bonn', 'DE', 'Germany', 'https://images.unsplash.com/photo-1597989618498-3a82da8be3bb?w=400&h=300&fit=crop', 62, 3),
('essen', 'Essen', 'Essen', 'Essen', 'Essen', 'Essen', 'DE', 'Germany', 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop', 63, 3),
('dortmund', 'Dortmund', 'Dortmund', 'Dortmund', 'Dortmund', 'Dortmund', 'DE', 'Germany', 'https://images.unsplash.com/photo-1578319493707-f8ed7a6d5f7e?w=400&h=300&fit=crop', 64, 3),
('bremen', 'Bremen', 'Bremen', 'Brême', 'Bremen', 'Brema', 'DE', 'Germany', 'https://images.unsplash.com/photo-1567354721844-26a30b380fc4?w=400&h=300&fit=crop', 65, 3),
('duisburg', 'Duisburg', 'Duisburg', 'Duisbourg', 'Duisburgo', 'Duisburg', 'DE', 'Germany', 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop', 66, 3),
('munster', 'Münster', 'Münster', 'Münster', 'Münster', 'Münster', 'DE', 'Germany', 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&h=300&fit=crop', 67, 3),
('karlsruhe', 'Karlsruhe', 'Karlsruhe', 'Karlsruhe', 'Karlsruhe', 'Karlsruhe', 'DE', 'Germany', 'https://images.unsplash.com/photo-1569930784237-ea65a528f007?w=400&h=300&fit=crop', 68, 3),
('mannheim', 'Mannheim', 'Mannheim', 'Mannheim', 'Mannheim', 'Mannheim', 'DE', 'Germany', 'https://images.unsplash.com/photo-1568636029543-ca4fe4148ca2?w=400&h=300&fit=crop', 69, 3),
('augsburg', 'Augsburg', 'Augsburg', 'Augsbourg', 'Augsburgo', 'Augusta', 'DE', 'Germany', 'https://images.unsplash.com/photo-1549619856-ac562a3ed1a3?w=400&h=300&fit=crop', 70, 3),
('wiesbaden', 'Wiesbaden', 'Wiesbaden', 'Wiesbaden', 'Wiesbaden', 'Wiesbaden', 'DE', 'Germany', 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=300&fit=crop', 71, 3),
('freiburg', 'Freiburg', 'Freiburg', 'Fribourg-en-Brisgau', 'Friburgo', 'Friburgo', 'DE', 'Germany', 'https://images.unsplash.com/photo-1570698473651-b2de99bae12f?w=400&h=300&fit=crop', 72, 3)

ON CONFLICT (code) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_de = EXCLUDED.name_de,
    name_fr = EXCLUDED.name_fr,
    name_es = EXCLUDED.name_es,
    name_it = EXCLUDED.name_it,
    country_code = EXCLUDED.country_code,
    country_en = EXCLUDED.country_en,
    picture_url = EXCLUDED.picture_url,
    sort_order = EXCLUDED.sort_order,
    tier = EXCLUDED.tier,
    updated_at = TIMEZONE('utc', NOW());

-- Create function to update timestamp on update
CREATE OR REPLACE FUNCTION update_cs_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_cs_cities_updated_at ON cs_cities;
CREATE TRIGGER trigger_cs_cities_updated_at
    BEFORE UPDATE ON cs_cities
    FOR EACH ROW
    EXECUTE FUNCTION update_cs_cities_updated_at();

-- Verify the data
SELECT COUNT(*) as total_cities,
       COUNT(DISTINCT country_code) as countries,
       MIN(sort_order) as min_sort,
       MAX(sort_order) as max_sort
FROM cs_cities;
