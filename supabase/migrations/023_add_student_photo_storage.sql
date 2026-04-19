-- ============================================================================
-- MIGRATION 023: Student photo storage bucket + photo_path column
-- ============================================================================
-- Sets up owner-managed photo uploads for students. Photos live in the
-- `student-photos` storage bucket; users.photo_path holds the filename.
-- Only OWNER-role users can write to the bucket; any authenticated user reads.
-- ============================================================================

BEGIN;

-- Step 1: Add photo_path column to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS photo_path text;

COMMENT ON COLUMN public.users.photo_path IS
  'Filename of uploaded photo within the student-photos bucket. NULL = no photo.';

-- Step 2: Create storage bucket (public read, image-only, 5MB cap)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 3: Storage RLS — owners write, authenticated users read
DROP POLICY IF EXISTS "student_photos_read"   ON storage.objects;
DROP POLICY IF EXISTS "student_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "student_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "student_photos_delete" ON storage.objects;

CREATE POLICY "student_photos_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'student-photos');

CREATE POLICY "student_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-photos'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER')
  );

CREATE POLICY "student_photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER')
  );

CREATE POLICY "student_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER')
  );

COMMIT;

DO $$
DECLARE
  bucket_exists boolean;
  col_exists    boolean;
  policy_count  int;
BEGIN
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'student-photos')
    INTO bucket_exists;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'photo_path'
  ) INTO col_exists;
  SELECT COUNT(*) INTO policy_count FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'student_photos_%';

  IF NOT bucket_exists THEN RAISE EXCEPTION 'student-photos bucket not created'; END IF;
  IF NOT col_exists    THEN RAISE EXCEPTION 'photo_path column missing';         END IF;
  IF policy_count < 4  THEN RAISE EXCEPTION 'Expected 4 policies, got %', policy_count; END IF;

  RAISE NOTICE 'student-photos bucket ready (public, 5MB cap, JPEG/PNG/WebP)';
  RAISE NOTICE 'users.photo_path column added';
  RAISE NOTICE '% storage policies in place (owner-only writes)', policy_count;
END $$;
