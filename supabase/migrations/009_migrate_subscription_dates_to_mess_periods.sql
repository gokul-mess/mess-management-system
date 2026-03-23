-- ============================================================================
-- MIGRATE SUBSCRIPTION DATES TO MESS PERIODS TABLE
-- ============================================================================
-- This script migrates existing subscription_start_date and subscription_end_date
-- from the users table to the mess_periods table.
--
-- Run this script in your Supabase SQL Editor AFTER running 008_add_mess_periods_table.sql
-- ============================================================================

-- Step 1: Migrate existing subscription dates to mess_periods
-- ============================================================================

DO $$
DECLARE
  migrated_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  -- Insert mess periods for all users who have subscription dates
  INSERT INTO public.mess_periods (user_id, start_date, end_date, original_end_date)
  SELECT 
    id as user_id,
    subscription_start_date::date as start_date,
    subscription_end_date::date as end_date,
    subscription_end_date::date as original_end_date
  FROM public.users
  WHERE subscription_start_date IS NOT NULL 
    AND subscription_end_date IS NOT NULL
    AND role = 'STUDENT'
    -- Only insert if no mess period exists for this user yet
    AND NOT EXISTS (
      SELECT 1 FROM public.mess_periods 
      WHERE mess_periods.user_id = users.id
    );
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  
  -- Count users who were skipped (already have mess periods)
  SELECT COUNT(*) INTO skipped_count
  FROM public.users
  WHERE subscription_start_date IS NOT NULL 
    AND subscription_end_date IS NOT NULL
    AND role = 'STUDENT'
    AND EXISTS (
      SELECT 1 FROM public.mess_periods 
      WHERE mess_periods.user_id = users.id
    );
  
  RAISE NOTICE '✅ Migrated % users to mess_periods table', migrated_count;
  RAISE NOTICE 'ℹ️  Skipped % users (already have mess periods)', skipped_count;
END $$;

-- Step 2: Verify the migration
-- ============================================================================

DO $$
DECLARE
  users_with_subscription INTEGER;
  users_with_mess_period INTEGER;
  users_missing_mess_period INTEGER;
BEGIN
  -- Count users with subscription dates
  SELECT COUNT(*) INTO users_with_subscription
  FROM public.users
  WHERE subscription_start_date IS NOT NULL 
    AND subscription_end_date IS NOT NULL
    AND role = 'STUDENT';
  
  -- Count users with mess periods
  SELECT COUNT(DISTINCT user_id) INTO users_with_mess_period
  FROM public.mess_periods;
  
  -- Count users with subscription but no mess period
  SELECT COUNT(*) INTO users_missing_mess_period
  FROM public.users
  WHERE subscription_start_date IS NOT NULL 
    AND subscription_end_date IS NOT NULL
    AND role = 'STUDENT'
    AND NOT EXISTS (
      SELECT 1 FROM public.mess_periods 
      WHERE mess_periods.user_id = users.id
    );
  
  RAISE NOTICE '';
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  • Users with subscription dates: %', users_with_subscription;
  RAISE NOTICE '  • Users with mess periods: %', users_with_mess_period;
  RAISE NOTICE '  • Users missing mess periods: %', users_missing_mess_period;
  
  IF users_missing_mess_period > 0 THEN
    RAISE WARNING '⚠️  Some users still missing mess periods!';
  ELSE
    RAISE NOTICE '✅ All users with subscriptions have mess periods';
  END IF;
END $$;

-- Step 3: Remove deprecated subscription columns from users table
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Removing deprecated subscription columns from users table...';

  -- Drop the trigger that depends on subscription_end_date first
  DROP TRIGGER IF EXISTS check_subscription_status ON public.users;
  RAISE NOTICE '✅ Dropped check_subscription_status trigger';

  -- Now safe to drop the columns
  ALTER TABLE public.users 
    DROP COLUMN IF EXISTS subscription_start_date,
    DROP COLUMN IF EXISTS subscription_end_date;
  
  RAISE NOTICE '✅ Removed subscription_start_date and subscription_end_date columns';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SUBSCRIPTION DATA MIGRATION COMPLETED!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • Migrated any existing subscription dates to mess_periods';
  RAISE NOTICE '  • Removed subscription_start_date/end_date from users table';
  RAISE NOTICE '  • Balance days feature now uses mess_periods table';
  RAISE NOTICE '  • Report generation feature now has data source';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '  1. Test balance days feature';
  RAISE NOTICE '  2. Test report generation';
  RAISE NOTICE '  3. Build UI for owners to manage mess periods';
  RAISE NOTICE '  4. Populate mess_periods for existing students';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- OPTIONAL: View migrated data
-- ============================================================================
-- Uncomment to see the migrated data:
-- 
-- SELECT 
--   u.full_name,
--   u.unique_short_id,
--   mp.start_date,
--   mp.end_date,
--   mp.original_end_date,
--   mp.created_at
-- FROM public.mess_periods mp
-- JOIN public.users u ON u.id = mp.user_id
-- ORDER BY mp.created_at DESC;
