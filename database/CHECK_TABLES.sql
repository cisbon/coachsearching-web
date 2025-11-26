-- Check which tables exist for the booking system

SELECT
    table_name,
    CASE
        WHEN table_name IN (
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        )
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('cs_users'),
        ('cs_coaches'),
        ('cs_clients'),
        ('cs_bookings'),
        ('cs_coach_availability'),
        ('cs_articles')
) AS required_tables(table_name);

-- If you see ❌ MISSING tables, run database/02_CREATE_SCHEMA.sql
