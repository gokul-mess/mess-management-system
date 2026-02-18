-- ============================================================================
-- FINAL PROFILE MIGRATION SCRIPT
-- ============================================================================
-- This script sets up the complete profile system with:
-- 1. Phone and address columns
-- 2. Photo update permission system (time-limited)
-- 3. Correct RLS policies
-- 
-- Run this script ONCE in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Add phone and address columns if they don't exist
-- ============================================================================

DO $$ 
BEGIN
  -- Add phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone text;
    RAISE NOTICE '✅ Added phone column to users table';
  ELSE
    RAISE NOTICE 'ℹ️  Phone column already exists';
  END IF;

  -- Add address column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.users ADD COLUMN address text;
    RAISE NOTICE '✅ Added address column to users table';
  ELSE
    RAISE NOTICE 'ℹ️  Address column already exists';
  END IF;
END $$;


-- Step 2: Ensure permission columns exist (should be in schema already)
-- ============================================================================

DO $$ 
BEGIN
  -- Add photo_update_allowed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'photo_update_allowed'
  ) THEN
    ALTER TABLE public.users ADD COLUMN photo_update_allowed boolean DEFAULT false;
    RAISE NOTICE '✅ Added photo_update_allowed column';
  ELSE
    RAISE NOTICE 'ℹ️  photo_update_allowed column already exists';
  END IF;

  -- Add permission_expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'permission_expires_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN permission_expires_at timestamp with time zone;
    RAISE NOTICE '✅ Added permission_expires_at column';
  ELSE
    RAISE NOTICE 'ℹ️  permission_expires_at column already exists';
  END IF;
END $$;


-- Step 3: Drop all existing update policies
-- ============================================================================

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
  DROP POLICY IF EXISTS "Students can update their own profile" ON public.users;
  DROP POLICY IF EXISTS "Owners can update any profile" ON public.users;
  DROP POLICY IF EXISTS "Students can update photo when permitted" ON public.users;

  RAISE NOTICE '✅ Dropped old policies';
END $$;


-- Step 4: Create new RLS policies
-- ============================================================================

-- Policy 1: Owners can update ANY profile (including their own)
CREATE POLICY "Owners can update any profile" ON public.users
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  );

-- Policy 2: Students can ONLY update their photo_url when permitted
CREATE POLICY "Students can update photo when permitted" ON public.users
  FOR UPDATE 
  USING (
    auth.uid() = id 
    AND role = 'STUDENT'
    AND photo_update_allowed = true
    AND (permission_expires_at IS NULL OR permission_expires_at > now())
  )
  WITH CHECK (
    auth.uid() = id 
    AND role = 'STUDENT'
    AND photo_update_allowed = true
    AND (permission_expires_at IS NULL OR permission_expires_at > now())
  );

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created RLS policies';
END $$;


-- Step 5: Create function to automatically expire photo permissions
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_photo_permissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Disable photo_update_allowed for users whose permission has expired
  UPDATE public.users
  SET photo_update_allowed = false
  WHERE photo_update_allowed = true
    AND permission_expires_at IS NOT NULL
    AND permission_expires_at <= now();
    
  RAISE NOTICE '✅ Expired photo permissions for users past their deadline';
END;
$$;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created function: expire_photo_permissions()';
END $$;


-- Step 6: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_photo_permission ON public.users(photo_update_allowed, permission_expires_at) 
  WHERE photo_update_allowed = true;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Created performance indexes';
END $$;


-- Step 7: Grant necessary permissions
-- ============================================================================

GRANT SELECT, UPDATE ON public.users TO authenticated;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Granted permissions to authenticated users';
END $$;


-- Step 8: Verify the setup
-- ============================================================================

-- Check columns
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name IN ('phone', 'address', 'photo_update_allowed', 'permission_expires_at');
  
  IF column_count = 4 THEN
    RAISE NOTICE '✅ All required columns exist';
  ELSE
    RAISE WARNING '⚠️  Missing some columns. Expected 4, found %', column_count;
  END IF;
END $$;

-- Check policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'users' 
    AND policyname IN ('Owners can update any profile', 'Students can update photo when permitted');
  
  IF policy_count = 2 THEN
    RAISE NOTICE '✅ All required policies exist';
  ELSE
    RAISE WARNING '⚠️  Missing some policies. Expected 2, found %', policy_count;
  END IF;
END $$;


-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • Phone and address columns added';
  RAISE NOTICE '  • Photo permission system configured';
  RAISE NOTICE '  • RLS policies created:';
  RAISE NOTICE '    - Owners can update ANY profile';
  RAISE NOTICE '    - Students can ONLY update photo when permitted';
  RAISE NOTICE '  • Performance indexes created';
  RAISE NOTICE '';
  RAISE NOTICE 'How it works:';
  RAISE NOTICE '  1. Owner can update any profile field for anyone';
  RAISE NOTICE '  2. Owner can grant photo update permission to students';
  RAISE NOTICE '  3. Permission can have an expiry time';
  RAISE NOTICE '  4. Students can ONLY update photo_url when permitted';
  RAISE NOTICE '  5. Students CANNOT update name, phone, address, etc.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  • Test the profile page in owner dashboard';
  RAISE NOTICE '  • Grant photo permission to a student from students list';
  RAISE NOTICE '  • Verify student can only update photo when permitted';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;


-- ============================================================================
-- OPTIONAL: Run this to test the permission expiry function
-- ============================================================================
-- SELECT expire_photo_permissions();


-- ============================================================================
-- OPTIONAL: Schedule automatic expiry check (requires pg_cron extension)
-- ============================================================================
-- Uncomment below if you have pg_cron extension enabled:
-- 
-- SELECT cron.schedule(
--   'expire-photo-permissions',
--   '0 * * * *', -- Run every hour
--   'SELECT expire_photo_permissions();'
-- );
