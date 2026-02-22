-- =============================================================================
-- Migration 004: Swap new tables into production
-- =============================================================================
-- Run ONLY after verifying data integrity with the checks in 003_migrate_data.sql
-- This script:
--   1. Archives old tables (rename to _archive)
--   2. Renames _new tables to production names
--   3. Recreates any views / functions that reference the old structure
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Archive old tables
--    (keep them for a rollback window; drop after confidence period)
-- ---------------------------------------------------------------------------
alter table if exists public.cs_posts   rename to cs_posts_archive;
alter table if exists public.cs_clients rename to cs_clients_archive;
alter table if exists public.cs_coaches rename to cs_coaches_archive;
alter table if exists public.cs_users   rename to cs_users_archive;

-- ---------------------------------------------------------------------------
-- 2. Promote new tables to production names
-- ---------------------------------------------------------------------------
alter table public.cs_users_new   rename to cs_users;
alter table public.cs_coaches_new rename to cs_coaches;
alter table public.cs_clients_new rename to cs_clients;
alter table public.cs_posts_new   rename to cs_posts;

-- ---------------------------------------------------------------------------
-- 3. Rename indexes to match canonical names
-- ---------------------------------------------------------------------------
alter index if exists idx_cs_users_new_email         rename to idx_cs_users_email;
alter index if exists idx_cs_users_new_user_type     rename to idx_cs_users_user_type;
alter index if exists idx_cs_users_new_slug          rename to idx_cs_users_slug;
alter index if exists idx_cs_users_new_referral_code rename to idx_cs_users_referral_code;
alter index if exists idx_cs_users_new_created_at    rename to idx_cs_users_created_at;
alter index if exists idx_cs_users_new_profile_data  rename to idx_cs_users_profile_data;
alter index if exists idx_cs_users_new_pd_is_featured    rename to idx_cs_users_pd_is_featured;
alter index if exists idx_cs_users_new_pd_is_verified    rename to idx_cs_users_pd_is_verified;
alter index if exists idx_cs_users_new_pd_hourly_rate    rename to idx_cs_users_pd_hourly_rate;
alter index if exists idx_cs_users_new_pd_city_id        rename to idx_cs_users_pd_city_id;

alter index if exists idx_cs_coaches_new_subscription_status rename to idx_cs_coaches_subscription_status;
alter index if exists idx_cs_coaches_new_trial_ends_at       rename to idx_cs_coaches_trial_ends_at;
alter index if exists idx_cs_coaches_new_stripe_account_id   rename to idx_cs_coaches_stripe_account_id;

alter index if exists idx_cs_clients_new_user_id rename to idx_cs_clients_user_id;

alter index if exists idx_cs_posts_new_user_id    rename to idx_cs_posts_user_id;
alter index if exists idx_cs_posts_new_created_at rename to idx_cs_posts_created_at;

-- ---------------------------------------------------------------------------
-- 4. Re-enable RLS and policies
--    Adjust these policies to match your existing RLS setup.
--    The patterns below are a starting point.
-- ---------------------------------------------------------------------------

-- cs_users
alter table public.cs_users enable row level security;

drop policy if exists "Users can read any profile" on public.cs_users;
create policy "Users can read any profile"
    on public.cs_users for select using (true);

drop policy if exists "Users can update own profile" on public.cs_users;
create policy "Users can update own profile"
    on public.cs_users for update using (auth.uid() = id);

-- cs_coaches
alter table public.cs_coaches enable row level security;

drop policy if exists "Anyone can read coach operational data" on public.cs_coaches;
create policy "Anyone can read coach operational data"
    on public.cs_coaches for select using (true);

drop policy if exists "Coaches can update own operational data" on public.cs_coaches;
create policy "Coaches can update own operational data"
    on public.cs_coaches for update using (auth.uid() = user_id);

-- cs_clients
alter table public.cs_clients enable row level security;

drop policy if exists "Clients can read own record" on public.cs_clients;
create policy "Clients can read own record"
    on public.cs_clients for select using (auth.uid() = user_id);

drop policy if exists "Clients can update own record" on public.cs_clients;
create policy "Clients can update own record"
    on public.cs_clients for update using (auth.uid() = user_id);

-- cs_posts (public read, owner write)
alter table public.cs_posts enable row level security;

drop policy if exists "Anyone can read posts" on public.cs_posts;
create policy "Anyone can read posts"
    on public.cs_posts for select using (true);

drop policy if exists "Users can create posts" on public.cs_posts;
create policy "Users can create posts"
    on public.cs_posts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.cs_posts;
create policy "Users can update own posts"
    on public.cs_posts for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.cs_posts;
create policy "Users can delete own posts"
    on public.cs_posts for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Helpful view: coach_profiles
--    Flattens cs_users + profile_data JSONB into a flat relation for easy
--    querying from the Supabase JS client / PostgREST.
-- ---------------------------------------------------------------------------
create or replace view public.coach_profiles as
select
    u.id,
    u.user_id,               -- alias: user_id = u.id for convenience
    u.email,
    u.full_name,
    u.avatar_url,
    u.slug,
    u.is_verified,
    u.is_active,
    u.language_preference,
    u.timezone,
    u.currency,
    u.created_at,
    u.updated_at,
    -- JSONB display fields promoted to columns
    u.profile_data->>'title'                         as title,
    u.profile_data->>'bio'                           as bio,
    u.profile_data->>'title_en'                      as title_en,
    u.profile_data->>'bio_en'                        as bio_en,
    u.profile_data->>'primary_profile_language'      as primary_profile_language,
    (u.profile_data->'specialties')                  as specialties,
    (u.profile_data->'languages')                    as languages,
    (u.profile_data->'session_types')                as session_types,
    (u.profile_data->>'hourly_rate')::numeric        as hourly_rate,
    (u.profile_data->>'years_experience')::int       as years_experience,
    (u.profile_data->>'is_featured')::boolean        as is_featured,
    (u.profile_data->>'profile_completion_percentage')::int as profile_completion_percentage,
    (u.profile_data->>'total_sessions_completed')::int as total_sessions_completed,
    (u.profile_data->>'profile_views')::int          as profile_views,
    (u.profile_data->>'city_id')::int                as city_id,
    u.profile_data->>'banner_url'                    as banner_url,
    u.profile_data->>'instagram_url'                 as instagram_url,
    u.profile_data->>'linkedin_url'                  as linkedin_url,
    u.profile_data->>'intro_video_url'               as intro_video_url,
    u.profile_data->>'website_url'                   as website_url,
    (u.profile_data->>'offers_free_discovery')::boolean as offers_free_discovery,
    -- Operational fields from cs_coaches
    co.stripe_account_id,
    co.stripe_onboarding_complete,
    co.stripe_charges_enabled,
    co.stripe_payouts_enabled,
    co.subscription_status,
    co.trial_ends_at,
    co.subscription_ends_at,
    co.stripe_subscription_id,
    co.subscription_price_yearly,
    co.onboarding_completed,
    co.verified_at,
    co.last_booking_at
from public.cs_users u
join public.cs_coaches co on co.user_id = u.id
where u.user_type = 'coach';

-- Alias column for backwards compat
comment on column public.coach_profiles.id is
    'Same as cs_users.id / the user UUID used as the coach identifier in new schema';

-- ---------------------------------------------------------------------------
-- 6. Update trigger: keep cs_coaches.total_sessions_completed in sync with
--    profile_data (or rely solely on JSONB — choose one strategy)
-- ---------------------------------------------------------------------------
-- The application layer writes both cs_coaches.total_sessions_completed AND
-- cs_users.profile_data->>'total_sessions_completed' so both stay in sync.
-- The view above reads from cs_coaches for the operational count.

commit;

-- =============================================================================
-- ROLLBACK PLAN
-- =============================================================================
-- If something goes wrong, revert with:
--
--   begin;
--   alter table if exists public.cs_posts    rename to cs_posts_rollback;
--   alter table if exists public.cs_clients  rename to cs_clients_rollback;
--   alter table if exists public.cs_coaches  rename to cs_coaches_rollback;
--   alter table if exists public.cs_users    rename to cs_users_rollback;
--   alter table if exists public.cs_posts_archive   rename to cs_posts;
--   alter table if exists public.cs_clients_archive rename to cs_clients;
--   alter table if exists public.cs_coaches_archive rename to cs_coaches;
--   alter table if exists public.cs_users_archive   rename to cs_users;
--   commit;
