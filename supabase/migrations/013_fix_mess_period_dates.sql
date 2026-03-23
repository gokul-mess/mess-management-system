-- ============================================================================
-- FIX MESS PERIOD DATES
-- ============================================================================
-- Fixes two issues with existing mess_period rows:
--
-- 1. Off-by-one: original_end_date was set as start + 30 days (31 inclusive).
--    Correct is start + 29 days (30 inclusive).
--
-- 2. end_date may be stale/wrong for periods that were saved before the fix.
--    Recompute end_date = original_end_date + approved leave days for that student.
--
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- Step 1: Fix original_end_date (subtract 1 day where it's currently start + 30)
UPDATE public.mess_periods
SET original_end_date = (start_date + INTERVAL '29 days')::date
WHERE is_active = true
  AND original_end_date = (start_date + INTERVAL '30 days')::date;

-- Step 2: Recompute end_date for each active period based on approved leaves
-- end_date = original_end_date + total approved leave days within the base window
UPDATE public.mess_periods mp
SET end_date = (
  mp.original_end_date + (
    SELECT COALESCE(SUM(
      LEAST(l.end_date, mp.original_end_date) - GREATEST(l.start_date, mp.start_date) + 1
    ), 0)
    FROM public.leaves l
    WHERE l.user_id = mp.user_id
      AND l.is_approved = true
      AND l.start_date <= mp.original_end_date
      AND l.end_date >= mp.start_date
  ) * INTERVAL '1 day'
)::date
WHERE mp.is_active = true;

-- Verify
SELECT 
  u.full_name,
  u.unique_short_id,
  mp.start_date,
  mp.original_end_date,
  mp.end_date,
  (mp.original_end_date - mp.start_date + 1) AS base_days,
  (mp.end_date - mp.original_end_date) AS leave_extension_days
FROM public.mess_periods mp
JOIN public.users u ON u.id = mp.user_id
WHERE mp.is_active = true
ORDER BY u.unique_short_id;
