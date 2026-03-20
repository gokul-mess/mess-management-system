-- ============================================================================
-- ADD MEAL_PLAN COLUMN TO MESS_PERIODS TABLE
-- ============================================================================
-- This migration adds a meal_plan column to the mess_periods table to track
-- which meal plan (Lunch, Dinner, or Both) a student is subscribed to during
-- each mess period.
--
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Add meal_plan column to mess_periods table
-- ============================================================================

ALTER TABLE public.mess_periods 
ADD COLUMN IF NOT EXISTS meal_plan text 
CHECK (meal_plan IN ('L', 'D', 'DL')) 
DEFAULT 'DL';

-- Add comment for documentation
COMMENT ON COLUMN public.mess_periods.meal_plan IS 'Meal plan for this period: L=Lunch only, D=Dinner only, DL=Both meals';

-- Step 2: Update existing records to have default meal_plan
-- ============================================================================

UPDATE public.mess_periods 
SET meal_plan = 'DL' 
WHERE meal_plan IS NULL;

-- Step 3: Make meal_plan NOT NULL after setting defaults
-- ============================================================================

ALTER TABLE public.mess_periods 
ALTER COLUMN meal_plan SET NOT NULL;

-- Step 4: Create index for meal_plan queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mess_periods_meal_plan 
  ON public.mess_periods(meal_plan);

CREATE INDEX IF NOT EXISTS idx_mess_periods_user_meal_plan 
  ON public.mess_periods(user_id, meal_plan);

-- Step 5: Verify the setup
-- ============================================================================

DO $$
DECLARE
  column_exists BOOLEAN;
  record_count INTEGER;
  null_count INTEGER;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mess_periods'
    AND column_name = 'meal_plan'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE 'meal_plan column exists';
  ELSE
    RAISE WARNING 'meal_plan column was not created';
  END IF;
  
  -- Check for NULL values
  SELECT COUNT(*) INTO record_count
  FROM public.mess_periods;
  
  SELECT COUNT(*) INTO null_count
  FROM public.mess_periods
  WHERE meal_plan IS NULL;
  
  IF record_count > 0 THEN
    IF null_count = 0 THEN
      RAISE NOTICE 'All % existing records have meal_plan set', record_count;
    ELSE
      RAISE WARNING '% out of % records have NULL meal_plan', null_count, record_count;
    END IF;
  ELSE
    RAISE NOTICE 'No existing records in mess_periods table';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===============================================================';
  RAISE NOTICE 'MEAL_PLAN COLUMN MIGRATION COMPLETED!';
  RAISE NOTICE '===============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - meal_plan column added to mess_periods table';
  RAISE NOTICE '  - Column constraint: CHECK (meal_plan IN (L, D, DL))';
  RAISE NOTICE '  - Default value: DL (Both meals)';
  RAISE NOTICE '  - All existing records updated with default value';
  RAISE NOTICE '  - Performance indexes created';
  RAISE NOTICE '';
  RAISE NOTICE 'Meal Plan Options:';
  RAISE NOTICE '  - L  = Lunch only';
  RAISE NOTICE '  - D  = Dinner only';
  RAISE NOTICE '  - DL = Both Lunch and Dinner (default)';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT NEXT STEPS:';
  RAISE NOTICE '  1. Update UI to allow owners to set meal_plan when creating periods';
  RAISE NOTICE '  2. Update analytics/reports to fetch meal_plan from mess_periods';
  RAISE NOTICE '  3. Join mess_periods with daily_logs to get accurate meal plans';
  RAISE NOTICE '';
  RAISE NOTICE 'Example Query:';
  RAISE NOTICE '  SELECT dl.*, mp.meal_plan';
  RAISE NOTICE '  FROM daily_logs dl';
  RAISE NOTICE '  JOIN mess_periods mp ON dl.user_id = mp.user_id';
  RAISE NOTICE '    AND dl.date BETWEEN mp.start_date AND mp.end_date';
  RAISE NOTICE '';
  RAISE NOTICE '===============================================================';
END $$;