-- ============================================================================
-- ADD LEAVE REJECTION TRACKING
-- ============================================================================
-- Adds fields to track leave rejection reasons and distinguish between
-- pending and rejected leaves
-- ============================================================================

-- Step 1: Add rejection tracking columns
-- ============================================================================
ALTER TABLE public.leaves
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS auto_adjusted boolean DEFAULT false;

-- Step 2: Add comment for documentation
-- ============================================================================
COMMENT ON COLUMN public.leaves.rejection_reason IS 
'Reason for leave rejection (e.g., "Insufficient duration after meal consumption")';

COMMENT ON COLUMN public.leaves.rejected_at IS 
'Timestamp when leave was rejected';

COMMENT ON COLUMN public.leaves.auto_adjusted IS 
'Whether leave was automatically adjusted due to meal consumption';

-- Step 3: Update the auto-adjust function to use rejection tracking
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
      SET is_approved = false,
          rejection_reason = 'All leave days had meal consumption',
          rejected_at = NOW(),
          auto_adjusted = true
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
      SET is_approved = false,
          rejection_reason = FORMAT('Insufficient duration (%s days) after meal consumption. Minimum 4 days required.', final_duration),
          rejected_at = NOW(),
          auto_adjusted = true,
          start_date = new_start_date,
          end_date = new_end_date
      WHERE leave_id = affected_leave.leave_id;
      
      RAISE NOTICE 'Leave % rejected due to insufficient duration', affected_leave.leave_id;
    ELSE
      -- Update leave period with new dates
      RAISE NOTICE 'Adjusting leave period from %–% to %–%', 
        affected_leave.start_date, affected_leave.end_date,
        new_start_date, new_end_date;
      
      UPDATE public.leaves
      SET start_date = new_start_date,
          end_date = new_end_date,
          auto_adjusted = true
      WHERE leave_id = affected_leave.leave_id;
      
      RAISE NOTICE 'Leave % adjusted successfully', affected_leave.leave_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Step 4: Recreate trigger (to use updated function)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_adjust_leave_on_meal ON public.daily_logs;

CREATE TRIGGER trigger_adjust_leave_on_meal
  AFTER INSERT OR UPDATE OF status ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION adjust_leave_on_meal_consumption();

-- Step 5: Verification
-- ============================================================================
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'leaves'
    AND column_name IN ('rejection_reason', 'rejected_at', 'auto_adjusted');
  
  IF column_count = 3 THEN
    RAISE NOTICE '✅ All rejection tracking columns added';
  ELSE
    RAISE WARNING '⚠️  Expected 3 columns, found %', column_count;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ LEAVE REJECTION TRACKING - COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '  • rejection_reason - Why leave was rejected';
  RAISE NOTICE '  • rejected_at - When leave was rejected';
  RAISE NOTICE '  • auto_adjusted - Whether auto-adjusted by system';
  RAISE NOTICE '';
  RAISE NOTICE 'Leave statuses:';
  RAISE NOTICE '  • is_approved = false, rejection_reason = NULL → Pending';
  RAISE NOTICE '  • is_approved = false, rejection_reason != NULL → Rejected';
  RAISE NOTICE '  • is_approved = true → Approved';
  RAISE NOTICE '';
  RAISE NOTICE 'Example rejection reasons:';
  RAISE NOTICE '  • "Insufficient duration (3 days) after meal consumption"';
  RAISE NOTICE '  • "All leave days had meal consumption"';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
