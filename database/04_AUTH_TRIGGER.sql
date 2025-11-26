-- =====================================================
-- STEP 4: CREATE AUTH TRIGGER FOR AUTO USER CREATION
-- This trigger automatically creates a cs_users record
-- when a new user signs up through Supabase Auth
-- =====================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_user_type TEXT;
    v_full_name TEXT;
    v_avatar_url TEXT;
BEGIN
    -- Extract user_type from metadata, default to 'client'
    v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');

    -- Extract full_name from metadata, fallback to email prefix
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- Generate avatar URL
    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.email
    );

    -- Insert into cs_users with explicit type casting
    INSERT INTO public.cs_users (
        id,
        email,
        full_name,
        role,
        user_type,
        avatar_url,
        is_email_verified,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_user_type::cs_user_role,  -- Explicit cast to enum
        v_user_type,                 -- Store as text too
        v_avatar_url,
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate key errors

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth signup
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure the function can be executed
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

COMMENT ON FUNCTION public.handle_new_user() IS
'Automatically creates a cs_users record when a new user signs up through Supabase Auth. Extracts user_type and full_name from metadata. Includes error handling to prevent auth failures.';

