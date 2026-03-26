-- ============================================================================
-- PREVENT LEAVE DELETION & ADD PROPER REJECTION HANDLING
-- ============================================================================
-- Removes DELETE permissions and adds proper rejection workflow
-- Ensures no leave data is ever deleted, only marked as rejected
-- ============================================================================

-- Step 1: Remove DELETE policies (prevent data loss)
-- ============================================================================
DROP POLICY IF EXISTS "Owners can delete any leaves" ON public.leaves;
DROP POLICY IF EXISTS "Students can delete their own leaves" ON public.leaves;

DO $$
BEGIN
  RAISE NOTICE '✅ Removed DELETE policies - leaves can no longer be deleted';
END $$;

-- Step 2: Add owner_rejected column to track manual rejections
-- ============================================================================
ALTER TABLE public.leaves
  ADD COLUMN IF NOT EXISTS owner_rejected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_rejection_reason text,
  ADD COLUMN IF NOT EXISTS owner_rejected_at timestamp with time zone;

COMMENT ON COLUMN public.leaves.owner_rejected IS 
'Whether leave was manually rejected by owner';

COMMENT ON COLUMN public.leaves.owner_rejection_reason IS 
'Reason provided by owner for rejection';

COMMENT ON COLUMN public.leaves.owner_rejected_at IS 
'Timestamp when owner rejected the leave';

-- Step 3: Create function for owner to reject leave
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_leave_request(
  p_leave_id uuid,
  p_rejection_reason text DEFAULT 'Rejected by owner'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update leave to rejected status
  UPDATE public.leaves
  SET is_approved = false,
      owner_rejected = true,
      owner_rejection_reason = p_rejection_reason,
      owner_rejected_at = NOW(),
      rejection_reason = p_rejection_reason
  WHERE leave_id = p_leave_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Leave % rejected by owner', p_leave_id;
    RETURN true;
  ELSE
    RAISE WARNING 'Leave % not found', p_leave_id;
    RETURN false;
  END IF;
END;
$$;

COMMENT ON FUNCTION reject_leave_request IS 
'Allows owner to reject a leave request with a reason. Does not delete data.';

-- Step 4: Grant execute permission to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION reject_leave_request TO authenticated;

-- Step 5: Update auto-adjust function to preserve approved status when adjusting
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
  current_date_check DATE;
BEGIN
  -- Only process if this is a consumed meal (VERIFIED, TAKEN, PRESENT, CONSUMED)
  IF NEW.status NOT IN ('VERIFIED', 'TAKEN', 'PRESENT', 'CONSUMED') THEN
    RETURN NEW;
  END IF;

  consumed_date := NEW.date;

  -- Find ALL leaves (both approved and pending) that include this date
  FOR affected_leave IN
    SELECT * FROM public.leaves
    WHERE user_id = NEW.user_id
      AND start_date <= consumed_date
      AND end_date >= consumed_date
  LOOP
    RAISE NOTICE 'Found leave (approved=%) affected by meal consumption on %', affected_leave.is_approved, consumed_date;
    
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
      RAISE NOTICE 'All leave days have meal consumption.';
      
      -- If leave was APPROVED, reject it
      IF affected_leave.is_approved THEN
        UPDATE public.leaves
        SET is_approved = false,
            rejection_reason = 'All leave days had meal consumption',
            rejected_at = NOW(),
            auto_adjusted = true
        WHERE leave_id = affected_leave.leave_id;
        RAISE NOTICE 'Approved leave % rejected due to complete meal consumption', affected_leave.leave_id;
      ELSE
        -- If leave was PENDING, just mark as auto-adjusted (let owner decide)
        UPDATE public.leaves
        SET auto_adjusted = true
        WHERE leave_id = affected_leave.leave_id;
        RAISE NOTICE 'Pending leave % marked as auto-adjusted (all days consumed)', affected_leave.leave_id;
      END IF;
      
      CONTINUE;
    END IF;

    -- Calculate final duration (inclusive)
    final_duration := (new_end_date - new_start_date) + 1;
    
    RAISE NOTICE 'New leave period: % to % (% days)', new_start_date, new_end_date, final_duration;

    -- ALWAYS update dates first (for both approved and pending)
    UPDATE public.leaves
    SET start_date = new_start_date,
        end_date = new_end_date,
        auto_adjusted = true
    WHERE leave_id = affected_leave.leave_id;

    -- ONLY reject if leave was APPROVED and final duration < 4 days
    IF affected_leave.is_approved AND final_duration < 4 THEN
      RAISE NOTICE 'Approved leave has insufficient duration (% days) < 4 days. Rejecting.', final_duration;
      
      UPDATE public.leaves
      SET is_approved = false,
          rejection_reason = FORMAT('Insufficient duration (%s days) after meal consumption. Minimum 4 days required.', final_duration),
          rejected_at = NOW()
      WHERE leave_id = affected_leave.leave_id;
      
      RAISE NOTICE 'Approved leave % rejected due to insufficient duration (dates preserved)', affected_leave.leave_id;
    ELSIF NOT affected_leave.is_approved THEN
      -- Leave is PENDING - just adjusted dates, let owner decide
      RAISE NOTICE 'Pending leave % adjusted to % days. Remains pending for owner approval.', affected_leave.leave_id, final_duration;
    ELSE
      -- Leave is APPROVED and duration >= 4 days
      RAISE NOTICE 'Approved leave % adjusted successfully and remains approved (% days)', affected_leave.leave_id, final_duration;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Step 6: Recreate trigger
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_adjust_leave_on_meal ON public.daily_logs;

CREATE TRIGGER trigger_adjust_leave_on_meal
  AFTER INSERT OR UPDATE OF status ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION adjust_leave_on_meal_consumption();

-- Step 7: Verification
-- ============================================================================
DO $$
DECLARE
  delete_policy_count INTEGER;
  column_count INTEGER;
BEGIN
  -- Check that DELETE policies are removed
  SELECT COUNT(*) INTO delete_policy_count
  FROM pg_policies
  WHERE tablename = 'leaves' AND cmd = 'DELETE';
  
  IF delete_policy_count = 0 THEN
    RAISE NOTICE '✅ No DELETE policies found - data is protected';
  ELSE
    RAISE WARNING '⚠️  Found % DELETE policies - data may not be protected', delete_policy_count;
  END IF;

  -- Check new columns
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'leaves'
    AND column_name IN ('owner_rejected', 'owner_rejection_reason', 'owner_rejected_at');
  
  IF column_count = 3 THEN
    RAISE NOTICE '✅ All owner rejection columns added';
  ELSE
    RAISE WARNING '⚠️  Expected 3 columns, found %', column_count;
  END IF;

  -- Check function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'reject_leave_request'
  ) THEN
    RAISE NOTICE '✅ Function reject_leave_request created';
  ELSE
    RAISE WARNING '⚠️  Function reject_leave_request not found';
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ LEAVE DELETION PREVENTION & REJECTION - COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  • DELETE policies removed - leaves cannot be deleted';
  RAISE NOTICE '  • Added owner_rejected, owner_rejection_reason columns';
  RAISE NOTICE '  • Created reject_leave_request() function';
  RAISE NOTICE '  • Updated auto-adjust to preserve dates when rejecting';
  RAISE NOTICE '';
  RAISE NOTICE 'Rejection workflow:';
  RAISE NOTICE '  1. Owner rejects: Call reject_leave_request(leave_id, reason)';
  RAISE NOTICE '  2. Auto-reject: Updates dates FIRST, then marks rejected';
  RAISE NOTICE '  3. All data preserved - nothing deleted';
  RAISE NOTICE '';
  RAISE NOTICE 'Leave statuses:';
  RAISE NOTICE '  • Pending: is_approved=false, rejection_reason=NULL';
  RAISE NOTICE '  • Owner Rejected: owner_rejected=true';
  RAISE NOTICE '  • Auto Rejected: rejection_reason!=NULL, owner_rejected=false';
  RAISE NOTICE '  • Approved: is_approved=true';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage example:';
  RAISE NOTICE '  SELECT reject_leave_request(';
  RAISE NOTICE '    ''<leave_id>'',';
  RAISE NOTICE '    ''Not enough notice provided''';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- View all leave statuses
-- SELECT 
--   leave_id,
--   start_date,
--   end_date,
--   is_approved,
--   owner_rejected,
--   rejection_reason,
--   auto_adjusted,
--   CASE 
--     WHEN is_approved THEN 'Approved'
--     WHEN owner_rejected THEN 'Owner Rejected'
--     WHEN rejection_reason IS NOT NULL THEN 'Auto Rejected'
--     ELSE 'Pending'
--   END as status
-- FROM leaves
-- ORDER BY created_at DESC;

-- Reject a leave (owner action)
-- SELECT reject_leave_request('<leave_id>', 'Insufficient notice');
