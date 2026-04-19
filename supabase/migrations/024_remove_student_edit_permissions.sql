-- ============================================================================
-- MIGRATION 024: Remove student self-edit permission system
-- ============================================================================
-- Context: Per client requirement, students cannot edit their own profile
-- at all. All profile changes happen exclusively via the owner, whose
-- "Owners can update any profile" policy (migration 016) remains in place.
--
-- This migration:
--   1. Drops the "Students can update photo when permitted" RLS policy.
--   2. Drops the now-unused permission columns on public.users:
--      - photo_update_allowed
--      - permission_expires_at
--      - profile_edit_allowed
--      - editable_fields
-- ============================================================================

BEGIN;

-- Step 1: Drop the student-side RLS policy
DROP POLICY IF EXISTS "Students can update photo when permitted" ON public.users;

-- Step 2: Drop the permission columns
ALTER TABLE public.users
  DROP COLUMN IF EXISTS photo_update_allowed,
  DROP COLUMN IF EXISTS permission_expires_at,
  DROP COLUMN IF EXISTS profile_edit_allowed,
  DROP COLUMN IF EXISTS editable_fields;

COMMIT;

-- Verification
DO $$
DECLARE
  col_count int;
  policy_exists boolean;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name IN (
      'photo_update_allowed',
      'permission_expires_at',
      'profile_edit_allowed',
      'editable_fields'
    );

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND policyname = 'Students can update photo when permitted'
  ) INTO policy_exists;

  IF col_count > 0  THEN RAISE EXCEPTION 'Permission columns still exist on public.users (count: %)', col_count; END IF;
  IF policy_exists  THEN RAISE EXCEPTION 'Student photo-update RLS policy still exists';                     END IF;

  RAISE NOTICE 'Dropped 4 permission columns from public.users';
  RAISE NOTICE 'Dropped "Students can update photo when permitted" RLS policy';
  RAISE NOTICE 'Students can no longer update any field on users; only owners can (via the existing owner policy)';
END $$;
