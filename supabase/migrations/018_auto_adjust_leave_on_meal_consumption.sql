-- ============================================================================
-- AUTO-ADJUST LEAVE PERIODS ON MEAL CONSUMPTION
-- ============================================================================
-- Automatically adjusts approved leave periods when student consumes meals
-- during their leave. If final duration < 4 days, leave is rejected.
-- 
-- Example:
-- - Leave: April 4-10 (7 days, approved)
-- - Student eats on April 4
-- - Leave auto-adjusted to: April 5-10 (6 days, still approved)
-- - Subscription extension adjusted accordingly
-- ============================================================================

-- Step 1: Create function to adjust leave period
-- ============================================================================
CREATE OR REPLACE FUNCTION adjust_leave_on_meal_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_leave RECORD;
  consumed_date DATE;
  new_start_date DATE;
  new_end_date DATE;
  final_duration INTEGER;
  consumed_dates_in_leave DATE[];
  leave_dates DATE[];
  current_date_check DATE;
BEGIN
  -- Only process if this is a consumed meal (VERIFIED, TAKEN, PRESENT, CONSUMED)
  IF NEW.status NOT IN ('VERIFIED', 'TAKEN', 'PRESENT', 'CONSUMED') THEN
    RETURN NEW;
  END IF;

  consumed_date := NEW.date;

  -- Find all approved leaves that include this date
  FOR affected_leave IN
    SELECT * FROM public.leaves
    WHERE user_id = NEW.user_id
      AND is_approved = true
      AND start_date <= consumed_date
      AND end_date >= consumed_date
  LOOP
    RAISE NOTICE 'Found approved leave affected by meal consumption on %', consumed_date;
    
    -- Get all dates when meals were consumed during this leave period
    SELECT ARRAY_AGG(DISTINCT date ORDER BY date)
    INTO consumed_dates_in_leave
    FROM public.daily_logs
    WHERE user_id = NEW.user_id
      AND date >= affected_leave.start_date
      AND date <= affected_leave.end_date
      AND status IN ('VERIFIED', 'TAKEN', 'PRESENT', 'CONSUMED');

    -- If no consumed dates found (shouldn't happen, but safety check)
    IF consumed_dates_in_leave IS NULL THEN
      consumed_dates_in_leave := ARRAY[consumed_date];
    END IF;

    RAISE NOTICE 'Consumed dates in leave: %', consumed_dates_in_leave;

    -- Find the first date in leave period that has NO meal consumption
    new_start_date := NULL;
    current_date_check := affected_leave.start_date;
    
    WHILE current_date_check <= affected_leave.end_date LOOP
      IF NOT (current_date_check = ANY(consumed_dates_in_leave)) THEN
        new_start_date := current_date_check;
        EXIT;
      END IF;
      current_date_check := current_date_check + INTERVAL '1 day';
    END LOOP;

    -- Find the last date in leave period that has NO meal consumption
    new_end_date := NULL;
    current_date_check := affected_leave.end_date;
    
    WHILE current_date_check >= affected_leave.start_date LOOP
      IF NOT (current_date_check = ANY(consumed_dates_in_leave)) THEN
        new_end_date := current_date_check;
        EXIT;
      END IF;
      current_date_check := current_date_check - INTERVAL '1 day';
    END LOOP;

    -- If no valid leave days remain (all days have meal consumption)
    IF new_start_date IS NULL OR new_end_date IS NULL THEN
      RAISE NOTICE 'All leave days have meal consumption. Rejecting leave.';
      
      UPDATE public.leaves
      SET is_approved = false
      WHERE leave_id = affected_leave.leave_id;
      
      RAISE NOTICE 'Leave % rejected due to complete meal consumption', affected_leave.leave_id;
      CONTINUE;
    END IF;

    -- Calculate final duration (inclusive)
    final_duration := (new_end_date - new_start_date) + 1;
    
    RAISE NOTICE 'New leave period: % to % (% days)', new_start_date, new_end_date, final_duration;

    -- If final duration < 4 days, reject the leave
    IF final_duration < 4 THEN
      RAISE NOTICE 'Final duration (% days) < 4 days. Rejecting leave.', final_duration;
      
      UPDATE public.leaves
      SET is_approved = false
      WHERE leave_id = affected_leave.leave_id;
      
      RAISE NOTICE 'Leave % rejected due to insufficient duration', affected_leave.leave_id;
    ELSE
      -- Update leave period with new dates
      RAISE NOTICE 'Adjusting leave period from %–% to %–%', 
        affected_leave.start_date, affected_leave.end_date,
        new_start_date, new_end_date;
      
      UPDATE public.leaves
      SET start_date = new_start_date,
          end_date = new_end_date
      WHERE leave_id = affected_leave.leave_id;
      
      RAISE NOTICE 'Leave % adjusted successfully', affected_leave.leave_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Step 2: Create trigger on daily_logs
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_adjust_leave_on_meal ON public.daily_logs;

CREATE TRIGGER trigger_adjust_leave_on_meal
  AFTER INSERT OR UPDATE OF status ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION adjust_leave_on_meal_consumption();

-- Step 3: Add comment for documentation
-- ============================================================================
COMMENT ON FUNCTION adjust_leave_on_meal_consumption() IS 
'Automatically adjusts approved leave periods when student consumes meals during leave.
Trims consumed dates from start and end of leave period.
Rejects leave if final duration < 4 days.';

-- Step 4: Verification
-- ============================================================================
DO $$
BEGIN
  -- Check if function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'adjust_leave_on_meal_consumption'
  ) THEN
    RAISE NOTICE '✅ Function adjust_leave_on_meal_consumption created';
  ELSE
    RAISE WARNING '⚠️  Function not found';
  END IF;

  -- Check if trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_adjust_leave_on_meal'
  ) THEN
    RAISE NOTICE '✅ Trigger trigger_adjust_leave_on_meal created';
  ELSE
    RAISE WARNING '⚠️  Trigger not found';
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ AUTO-ADJUST LEAVE ON MEAL CONSUMPTION - COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'How it works:';
  RAISE NOTICE '  1. Student has approved leave: April 4-10 (7 days)';
  RAISE NOTICE '  2. Student consumes meal on April 4';
  RAISE NOTICE '  3. System auto-adjusts leave to: April 5-10 (6 days)';
  RAISE NOTICE '  4. Leave remains approved (duration >= 4 days)';
  RAISE NOTICE '';
  RAISE NOTICE '  If student consumes meals on April 4, 5, 6, 7:';
  RAISE NOTICE '  - Leave adjusted to: April 8-10 (3 days)';
  RAISE NOTICE '  - Leave REJECTED (duration < 4 days)';
  RAISE NOTICE '';
  RAISE NOTICE 'Rules:';
  RAISE NOTICE '  • Trims consumed dates from start and end';
  RAISE NOTICE '  • Keeps leave approved if final duration >= 4 days';
  RAISE NOTICE '  • Rejects leave if final duration < 4 days';
  RAISE NOTICE '  • Triggers on meal log insert or status update';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- TESTING QUERIES (Optional - for manual testing)
-- ============================================================================

-- Test Scenario 1: Create test leave
-- INSERT INTO public.leaves (user_id, start_date, end_date, is_approved)
-- VALUES ('<student_id>', '2026-04-04', '2026-04-10', true);

-- Test Scenario 2: Log meal consumption on first day
-- INSERT INTO public.daily_logs (user_id, date, meal_type, status)
-- VALUES ('<student_id>', '2026-04-04', 'LUNCH', 'CONSUMED');

-- Test Scenario 3: Check if leave was adjusted
-- SELECT * FROM public.leaves WHERE user_id = '<student_id>' ORDER BY created_at DESC LIMIT 1;

-- Expected result: start_date should be '2026-04-05', end_date '2026-04-10', is_approved = true
