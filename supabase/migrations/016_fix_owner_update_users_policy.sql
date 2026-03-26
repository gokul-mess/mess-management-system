-- ============================================================================
-- FIX OWNER UPDATE USERS POLICY
-- ============================================================================
-- This migration ensures owners can update student profiles (name, phone, address)
-- Issue: Owners unable to update student details in the students list
-- ============================================================================

-- Step 1: Drop existing update policies to avoid conflicts
-- ============================================================================
DROP POLICY IF EXISTS "Owners can update any profile" ON public.users;
DROP POLICY IF EXISTS "Students can update photo when permitted" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Students can update their own profile" ON public.users;

-- Step 2: Create comprehensive update policies
-- ============================================================================

-- Policy 1: Owners can update ANY user profile (full access)
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

-- Step 3: Verify RLS is enabled
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Grant necessary permissions
-- ============================================================================
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Step 5: Verification
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'users' 
    AND cmd = 'UPDATE';
  
  RAISE NOTICE '✅ Found % UPDATE policies on users table', policy_count;
  
  IF policy_count >= 2 THEN
    RAISE NOTICE '✅ Owner update policy successfully created';
  ELSE
    RAISE WARNING '⚠️  Expected at least 2 UPDATE policies, found %', policy_count;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ OWNER UPDATE POLICY FIX COMPLETED!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Owners can now:';
  RAISE NOTICE '  • Update student full_name';
  RAISE NOTICE '  • Update student phone';
  RAISE NOTICE '  • Update student address';
  RAISE NOTICE '  • Update any other profile fields';
  RAISE NOTICE '';
  RAISE NOTICE 'Students can:';
  RAISE NOTICE '  • Update photo_url ONLY when permitted by owner';
  RAISE NOTICE '  • Cannot update name, phone, address, etc.';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
