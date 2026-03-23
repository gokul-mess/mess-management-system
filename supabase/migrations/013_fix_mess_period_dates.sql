-- ============================================================================
-- FIX MESS PERIOD DATES + ADD is_active COLUMN
-- ============================================================================

-- Step 1: Add is_active column to mess_periods (was missing from initial schema)
ALTER TABLE public.mess_periods
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

-- Mark the most recent period per user as active
-- (for any existing rows migrated from subscription dates)
UPDATE public.mess_periods mp
SET is_active = true
WHERE mp.id IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.mess_periods
  ORDER BY user_id, start_date DESC
);

-- Add unique partial index: only one active period per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_mess_periods_one_active_per_user
  ON public.mess_periods (user_id)
  WHERE is_active = true;

-- Step 2: Fix original_end_date off-by-one
-- Previous code did start + 30 days = 31 inclusive days. Correct is start + 29 = 30 inclusive.
UPDATE public.mess_periods
SET original_end_date = (start_date + INTERVAL '29 days')::date
WHERE is_active = true
  AND original_end_date = (start_date + INTERVAL '30 days')::date;

-- Step 3: Recompute end_date for each active period
-- end_date = original_end_date + total approved leave days overlapping the base window
UPDATE public.mess_periods mp
SET end_date = (
  mp.original_end_date + (
    SELECT COALESCE(SUM(
      LEAST(l.end_date, mp.original_end_date)
      - GREATEST(l.start_date, mp.start_date)
      + 1
    ), 0)
    FROM public.leaves l
    WHERE l.user_id = mp.user_id
      AND l.is_approved = true
      AND l.start_date <= mp.original_end_date
      AND l.end_date   >= mp.start_date
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
  (mp.end_date - mp.original_end_date)        AS leave_extension_days,
  mp.is_active
FROM public.mess_periods mp
JOIN public.users u ON u.id = mp.user_id
ORDER BY u.unique_short_id;
