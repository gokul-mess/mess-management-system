-- ============================================================================
-- SUBSCRIPTION MODEL ENHANCEMENTS
-- ============================================================================
-- Adds support for:
-- 1. Meal type substitution tracking
-- 2. Extra meals (debt) tracking
-- 3. Automatic active status updates based on subscription expiry
-- ============================================================================

-- Step 1: Add columns to daily_logs for substitution tracking
-- ============================================================================
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS is_substitution boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS substitution_note text,
  ADD COLUMN IF NOT EXISTS original_meal_type text;

COMMENT ON COLUMN public.daily_logs.is_substitution IS 
'True if meal type was substituted (e.g., L student eating dinner using lunch quota)';

COMMENT ON COLUMN public.daily_logs.substitution_note IS 
'Note explaining the substitution';

COMMENT ON COLUMN public.daily_logs.original_meal_type IS 
'Original meal type if substituted (e.g., LUNCH when student ate DINNER)';

-- Step 2: Add extra meals tracking to mess_periods
-- ============================================================================
ALTER TABLE public.mess_periods
  ADD COLUMN IF NOT EXISTS extra_meals_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone;

COMMENT ON COLUMN public.mess_periods.extra_meals_count IS 
'Count of extra meals consumed after subscription expired (debt)';

COMMENT ON COLUMN public.mess_periods.status_updated_at IS 
'Timestamp when active status was last updated (prevents duplicate trigger execution)';

-- Step 3: Create function to update user active status
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_active_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update if end_date has passed and status hasn't been updated yet
  IF NEW.end_date < CURRENT_DATE 
     AND NEW.is_active = true 
     AND (NEW.status_updated_at IS NULL OR NEW.status_updated_at < NEW.end_date) THEN
    
    -- Update users.is_active to false
    UPDATE public.users
    SET is_active = false
    WHERE id = NEW.user_id;
    
    -- Mark this period as status updated
    NEW.status_updated_at = NOW();
    
    RAISE NOTICE 'Updated user % active status to false (subscription expired)', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_user_active_status IS 
'Automatically updates users.is_active to false when mess_periods.end_date passes';

-- Step 4: Create trigger for active status updates
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_active_status ON public.mess_periods;

CREATE TRIGGER trigger_update_active_status
  BEFORE UPDATE ON public.mess_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_user_active_status();

-- Step 5: Create function to check expired subscriptions (run daily)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update all expired subscriptions
  WITH updated_users AS (
    UPDATE public.users u
    SET is_active = false
    WHERE EXISTS (
      SELECT 1 FROM public.mess_periods mp
      WHERE mp.user_id = u.id
        AND mp.is_active = true
        AND mp.end_date < CURRENT_DATE
        AND (mp.status_updated_at IS NULL OR mp.status_updated_at < mp.end_date)
    )
    AND u.is_active = true
    RETURNING u.id
  )
  SELECT COUNT(*) INTO updated_count FROM updated_users;
  
  -- Mark periods as updated
  UPDATE public.mess_periods
  SET status_updated_at = NOW()
  WHERE is_active = true
    AND end_date < CURRENT_DATE
    AND (status_updated_at IS NULL OR status_updated_at < end_date);
  
  RAISE NOTICE 'Checked expired subscriptions: % users updated', updated_count;
END;
$$;

COMMENT ON FUNCTION check_expired_subscriptions IS 
'Checks all active mess periods and updates users.is_active for expired subscriptions. Run daily via cron.';

-- Step 6: Grant execute permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION update_user_active_status TO authenticated;
GRANT EXECUTE ON FUNCTION check_expired_subscriptions TO authenticated;

-- Step 7: Create function to deduct subscription days
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_subscription_day(
  p_user_id uuid,
  p_days integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_end_date date;
BEGIN
  -- Lock the active row for this user
  SELECT end_date
    INTO v_end_date
    FROM public.mess_periods
   WHERE user_id = p_user_id
     AND is_active = true
   FOR UPDATE;

  IF v_end_date IS NULL THEN
    RAISE EXCEPTION 'No active mess period found for user %', p_user_id;
  END IF;

  -- Deduct days from end_date
  UPDATE public.mess_periods
     SET end_date = v_end_date - p_days
   WHERE user_id = p_user_id
     AND is_active = true;
     
  RAISE NOTICE 'Deducted % days from user % subscription', p_days, p_user_id;
END;
$$;

COMMENT ON FUNCTION deduct_subscription_day IS 
'Deducts specified number of days from active mess period end_date';

GRANT EXECUTE ON FUNCTION deduct_subscription_day TO authenticated;

-- Step 8: Verification
-- ============================================================================
DO $$
DECLARE
  daily_logs_columns INTEGER;
  mess_periods_columns INTEGER;
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check daily_logs columns
  SELECT COUNT(*) INTO daily_logs_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'daily_logs'
    AND column_name IN ('is_substitution', 'substitution_note', 'original_meal_type');
  
  IF daily_logs_columns = 3 THEN
    RAISE NOTICE '✅ daily_logs substitution columns added';
  ELSE
    RAISE WARNING '⚠️  Expected 3 daily_logs columns, found %', daily_logs_columns;
  END IF;

  -- Check mess_periods columns
  SELECT COUNT(*) INTO mess_periods_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'mess_periods'
    AND column_name IN ('extra_meals_count', 'status_updated_at');
  
  IF mess_periods_columns = 2 THEN
    RAISE NOTICE '✅ mess_periods tracking columns added';
  ELSE
    RAISE WARNING '⚠️  Expected 2 mess_periods columns, found %', mess_periods_columns;
  END IF;

  -- Check trigger
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'trigger_update_active_status';
  
  IF trigger_count > 0 THEN
    RAISE NOTICE '✅ Active status trigger created';
  ELSE
    RAISE WARNING '⚠️  Active status trigger not found';
  END IF;

  -- Check functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('update_user_active_status', 'check_expired_subscriptions', 'deduct_subscription_day');
  
  IF function_count = 3 THEN
    RAISE NOTICE '✅ All functions created';
  ELSE
    RAISE WARNING '⚠️  Expected 3 functions, found %', function_count;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SUBSCRIPTION MODEL ENHANCEMENTS - COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'New Features:';
  RAISE NOTICE '  • Meal type substitution tracking';
  RAISE NOTICE '  • Extra meals (debt) tracking';
  RAISE NOTICE '  • Automatic active status updates';
  RAISE NOTICE '';
  RAISE NOTICE 'New Columns:';
  RAISE NOTICE '  daily_logs:';
  RAISE NOTICE '    - is_substitution (boolean)';
  RAISE NOTICE '    - substitution_note (text)';
  RAISE NOTICE '    - original_meal_type (text)';
  RAISE NOTICE '  mess_periods:';
  RAISE NOTICE '    - extra_meals_count (integer)';
  RAISE NOTICE '    - status_updated_at (timestamp)';
  RAISE NOTICE '';
  RAISE NOTICE 'New Functions:';
  RAISE NOTICE '  • update_user_active_status() - Trigger function';
  RAISE NOTICE '  • check_expired_subscriptions() - Run daily';
  RAISE NOTICE '  • deduct_subscription_day(user_id, days) - Deduct days';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage:';
  RAISE NOTICE '  -- Check expired subscriptions manually:';
  RAISE NOTICE '  SELECT check_expired_subscriptions();';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Deduct days from subscription:';
  RAISE NOTICE '  SELECT deduct_subscription_day(''<user_id>'', 1);';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
