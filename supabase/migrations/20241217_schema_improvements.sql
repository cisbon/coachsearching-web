-- Migration: Schema Improvements for CoachSearching
-- Date: 2024-12-17
-- Changes:
--   1. Add messaging tables (cs_conversations, cs_messages)
--   2. Add user_id to cs_reviews with unique constraint (1 review per user per coach)
--   3. Rename client_id to user_id in cs_favorites

-- ============================================================================
-- 1. MESSAGING SYSTEM
-- ============================================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS public.cs_conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    coach_id uuid NOT NULL,
    client_id uuid NOT NULL,
    subject text,
    last_message_at timestamp with time zone,
    last_message_preview text,
    coach_unread_count integer DEFAULT 0,
    client_unread_count integer DEFAULT 0,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_conversations_pkey PRIMARY KEY (id),
    CONSTRAINT cs_conversations_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.cs_coaches(id) ON DELETE CASCADE,
    CONSTRAINT cs_conversations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.cs_clients(id) ON DELETE CASCADE,
    CONSTRAINT cs_conversations_unique_pair UNIQUE (coach_id, client_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.cs_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('coach', 'client')),
    content text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cs_messages_pkey PRIMARY KEY (id),
    CONSTRAINT cs_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.cs_conversations(id) ON DELETE CASCADE,
    CONSTRAINT cs_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.cs_users(id) ON DELETE CASCADE
);

-- Indexes for messaging performance
CREATE INDEX IF NOT EXISTS idx_cs_conversations_coach_id ON public.cs_conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_cs_conversations_client_id ON public.cs_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_cs_conversations_last_message ON public.cs_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_messages_conversation_id ON public.cs_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cs_messages_created_at ON public.cs_messages(conversation_id, created_at DESC);

-- ============================================================================
-- 2. ADD USER_ID TO CS_REVIEWS (for verified reviews)
-- ============================================================================

-- Add user_id column to cs_reviews
ALTER TABLE public.cs_reviews
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.cs_users(id) ON DELETE SET NULL;

-- Add unique constraint: one review per user per coach
-- First, we need to handle potential duplicates if any exist
-- This constraint only applies when user_id is NOT NULL (anonymous reviews allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_reviews_user_coach_unique
ON public.cs_reviews(user_id, coach_id)
WHERE user_id IS NOT NULL;

-- Add is_verified column to distinguish verified vs anonymous reviews
ALTER TABLE public.cs_reviews
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Add helpful review metadata
ALTER TABLE public.cs_reviews
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- ============================================================================
-- 3. RENAME client_id TO user_id IN CS_FAVORITES
-- ============================================================================

-- Step 1: Add new user_id column
ALTER TABLE public.cs_favorites
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Step 2: Copy data from client_id to user_id
UPDATE public.cs_favorites
SET user_id = client_id
WHERE user_id IS NULL;

-- Step 3: Add NOT NULL constraint and foreign key
ALTER TABLE public.cs_favorites
ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Add foreign key constraint for user_id (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'cs_favorites_user_id_fkey'
    ) THEN
        ALTER TABLE public.cs_favorites
        ADD CONSTRAINT cs_favorites_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.cs_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 5: Drop old client_id foreign key constraint
ALTER TABLE public.cs_favorites
DROP CONSTRAINT IF EXISTS cs_favorites_client_id_fkey;

-- Step 6: Drop old client_id column
ALTER TABLE public.cs_favorites
DROP COLUMN IF EXISTS client_id;

-- Step 7: Add unique constraint (user can only favorite a coach once)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_favorites_user_coach_unique
ON public.cs_favorites(user_id, coach_id);

-- ============================================================================
-- 4. ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_cs_bookings_coach_id ON public.cs_bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_cs_bookings_client_id ON public.cs_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_cs_bookings_status ON public.cs_bookings(status);
CREATE INDEX IF NOT EXISTS idx_cs_bookings_start_time ON public.cs_bookings(start_time);

-- Notifications index for unread
CREATE INDEX IF NOT EXISTS idx_cs_notifications_user_unread
ON public.cs_notifications(user_id, is_read)
WHERE is_read = false;

-- Discovery requests indexes
CREATE INDEX IF NOT EXISTS idx_cs_discovery_requests_coach_id ON public.cs_discovery_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_cs_discovery_requests_status ON public.cs_discovery_requests(status);

-- Coaches active index
CREATE INDEX IF NOT EXISTS idx_cs_coaches_active
ON public.cs_coaches(is_active)
WHERE is_active = true;

-- Reviews index
CREATE INDEX IF NOT EXISTS idx_cs_reviews_coach_id ON public.cs_reviews(coach_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.cs_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can see their own conversations
CREATE POLICY "Users can view own conversations" ON public.cs_conversations
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.cs_coaches WHERE id = coach_id
            UNION
            SELECT user_id FROM public.cs_clients WHERE id = client_id
        )
    );

-- Conversations: Users can create conversations they're part of
CREATE POLICY "Users can create conversations" ON public.cs_conversations
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.cs_coaches WHERE id = coach_id
            UNION
            SELECT user_id FROM public.cs_clients WHERE id = client_id
        )
    );

-- Conversations: Users can update their own conversations
CREATE POLICY "Users can update own conversations" ON public.cs_conversations
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.cs_coaches WHERE id = coach_id
            UNION
            SELECT user_id FROM public.cs_clients WHERE id = client_id
        )
    );

-- Messages: Users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations" ON public.cs_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM public.cs_conversations
            WHERE auth.uid() IN (
                SELECT user_id FROM public.cs_coaches WHERE id = coach_id
                UNION
                SELECT user_id FROM public.cs_clients WHERE id = client_id
            )
        )
    );

-- Messages: Users can send messages in their conversations
CREATE POLICY "Users can send messages" ON public.cs_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM public.cs_conversations
            WHERE auth.uid() IN (
                SELECT user_id FROM public.cs_coaches WHERE id = coach_id
                UNION
                SELECT user_id FROM public.cs_clients WHERE id = client_id
            )
        )
    );

-- ============================================================================
-- 6. HELPER FUNCTION: Update conversation on new message
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.cs_conversations
    SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        updated_at = now(),
        coach_unread_count = CASE
            WHEN NEW.sender_type = 'client' THEN coach_unread_count + 1
            ELSE coach_unread_count
        END,
        client_unread_count = CASE
            WHEN NEW.sender_type = 'coach' THEN client_unread_count + 1
            ELSE client_unread_count
        END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for message updates
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.cs_messages;
CREATE TRIGGER trigger_update_conversation_on_message
    AFTER INSERT ON public.cs_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_on_message();

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.cs_conversations IS 'Stores conversations between coaches and clients';
COMMENT ON TABLE public.cs_messages IS 'Stores individual messages within conversations';
COMMENT ON COLUMN public.cs_reviews.user_id IS 'Links review to authenticated user (NULL for anonymous reviews)';
COMMENT ON COLUMN public.cs_reviews.is_verified IS 'True if reviewer is a verified user who had a session';
COMMENT ON COLUMN public.cs_favorites.user_id IS 'The user who favorited the coach';
