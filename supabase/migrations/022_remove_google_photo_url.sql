-- ============================================================================
-- MIGRATION 022: Remove Google profile photo URL from users table
-- ============================================================================
-- Drops users.photo_url (which stored the Google OAuth avatar_url) and updates
-- the auth signup trigger so new Google logins no longer copy avatar_url.
--
-- Context: Client requirement — student photos will instead be uploaded by the
-- owner into a Supabase Storage bucket (handled in a later migration/feature).
-- ============================================================================

BEGIN;

-- Step 1: Replace handle_new_user() so signups no longer insert photo_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'STUDENT'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop the photo_url column
ALTER TABLE public.users DROP COLUMN IF EXISTS photo_url;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'photo_url'
  ) INTO col_exists;

  IF col_exists THEN
    RAISE EXCEPTION 'photo_url column still exists on public.users';
  ELSE
    RAISE NOTICE 'photo_url column removed from public.users';
    RAISE NOTICE 'handle_new_user() trigger updated (no longer copies Google avatar_url)';
  END IF;
END $$;
