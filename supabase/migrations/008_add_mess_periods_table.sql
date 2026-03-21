-- ============================================================================
-- ADD MESS PERIODS TABLE MIGRATION
-- ============================================================================
-- This script creates the mess_periods table required for the report generation
-- feature to track subscription periods and leave extensions.
--
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Create mess_periods table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mess_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  original_end_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.mess_periods IS 'Tracks mess subscription periods for students, including leave extensions';
COMMENT ON COLUMN public.mess_periods.start_date IS 'Start date of the mess period';
COMMENT ON COLUMN public.mess_periods.end_date IS 'Current end date (may be extended due to leaves)';
COMMENT ON COLUMN public.mess_periods.original_end_date IS 'Original end date before any leave extensions';

-- Step 2: Enable RLS
-- ============================================================================

ALTER TABLE public.mess_periods ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies (idempotent - drop if exists first)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can view all mess periods" ON public.mess_periods;
DROP POLICY IF EXISTS "Students can view their own mess periods" ON public.mess_periods;
DROP POLICY IF EXISTS "Owners can insert mess periods" ON public.mess_periods;
DROP POLICY IF EXISTS "Owners can update mess periods" ON public.mess_periods;
DROP POLICY IF EXISTS "Owners can delete mess periods" ON public.mess_periods;

-- Owners can view all mess periods
CREATE POLICY "Owners can view all mess periods" ON public.mess_periods
  FOR SELECT USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- Students can view their own mess periods
CREATE POLICY "Students can view their own mess periods" ON public.mess_periods
  FOR SELECT USING ( auth.uid() = user_id );

-- Owners can insert mess periods
CREATE POLICY "Owners can insert mess periods" ON public.mess_periods
  FOR INSERT WITH CHECK (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- Owners can update any mess periods
CREATE POLICY "Owners can update mess periods" ON public.mess_periods
  FOR UPDATE USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- Owners can delete any mess periods
CREATE POLICY "Owners can delete mess periods" ON public.mess_periods
  FOR DELETE USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- Step 4: Create indexes for better query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mess_periods_user_id 
  ON public.mess_periods(user_id);

CREATE INDEX IF NOT EXISTS idx_mess_periods_dates 
  ON public.mess_periods(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_mess_periods_user_dates 
  ON public.mess_periods(user_id, start_date, end_date);

-- Step 5: Create trigger to auto-update updated_at (idempotent)
-- ============================================================================

DROP TRIGGER IF EXISTS mess_periods_updated_at ON public.mess_periods;
DROP FUNCTION IF EXISTS update_mess_periods_updated_at();

CREATE OR REPLACE FUNCTION update_mess_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mess_periods_updated_at
  BEFORE UPDATE ON public.mess_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_mess_periods_updated_at();

-- Step 6: Verify the setup
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'mess_periods'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ mess_periods table exists';
  ELSE
    RAISE WARNING '⚠️  mess_periods table was not created';
  END IF;
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'mess_periods';
  
  IF policy_count = 5 THEN
    RAISE NOTICE '✅ All 5 RLS policies created';
  ELSE
    RAISE WARNING '⚠️  Expected 5 policies, found %', policy_count;
  END IF;
  
  -- Check indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE tablename = 'mess_periods';
  
  IF index_count >= 3 THEN
    RAISE NOTICE '✅ Performance indexes created';
  ELSE
    RAISE WARNING '⚠️  Expected at least 3 indexes, found %', index_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MESS PERIODS TABLE MIGRATION COMPLETED!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • mess_periods table created';
  RAISE NOTICE '  • RLS policies configured (5 policies)';
  RAISE NOTICE '  • Performance indexes created (3 indexes)';
  RAISE NOTICE '  • Auto-update trigger for updated_at';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT NEXT STEPS:';
  RAISE NOTICE '  1. Owners need UI to create/manage mess periods';
  RAISE NOTICE '  2. Populate initial mess periods for existing students';
  RAISE NOTICE '  3. Report generation feature will now work correctly';
  RAISE NOTICE '';
  RAISE NOTICE 'Table Structure:';
  RAISE NOTICE '  - id: UUID primary key';
  RAISE NOTICE '  - user_id: References users table';
  RAISE NOTICE '  - start_date: Mess period start';
  RAISE NOTICE '  - end_date: Current end (with extensions)';
  RAISE NOTICE '  - original_end_date: Original end before leaves';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- OPTIONAL: Sample data for testing
-- ============================================================================
-- Uncomment and modify to add test data:
-- 
-- INSERT INTO public.mess_periods (user_id, start_date, end_date, original_end_date)
-- VALUES (
--   '<student-user-id>',
--   '2026-03-01',
--   '2026-03-31',
--   '2026-03-31'
-- );
