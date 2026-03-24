-- ============================================================================
-- LINK FEE PAYMENTS TO MESS PERIODS
-- ============================================================================
-- Adds mess_period_id foreign key to fee_payments so payments are linked to
-- rolling 30-day mess periods instead of calendar months (YYYY-MM).
-- This fixes the bug where the UI can't find payments when a mess period
-- crosses a calendar-month boundary.
-- ============================================================================

-- Step 1: Add mess_period_id column (nullable — existing rows won't break)
ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS mess_period_id uuid REFERENCES public.mess_periods(id) ON DELETE SET NULL;

-- Step 2: Backfill existing rows — link each payment to the mess period
-- whose date range contains the payment's paid_at timestamp
UPDATE public.fee_payments fp
SET mess_period_id = mp.id
FROM public.mess_periods mp
WHERE fp.user_id = mp.user_id
  AND fp.mess_period_id IS NULL
  AND fp.paid_at::date BETWEEN mp.start_date AND mp.end_date;

-- Step 3: Drop old unique constraint if it exists, add new one scoped to mess_period
ALTER TABLE public.fee_payments
  DROP CONSTRAINT IF EXISTS fee_payments_user_period_installment_key;

ALTER TABLE public.fee_payments
  ADD CONSTRAINT fee_payments_user_period_installment_key
  UNIQUE (user_id, mess_period_id, installment_number);

-- Step 4: Index for fast lookups by mess_period_id
CREATE INDEX IF NOT EXISTS idx_fee_payments_mess_period
  ON public.fee_payments(mess_period_id);
