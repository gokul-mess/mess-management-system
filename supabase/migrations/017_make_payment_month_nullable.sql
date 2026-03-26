-- ============================================================================
-- MAKE PAYMENT_MONTH NULLABLE
-- ============================================================================
-- Since we now use mess_period_id instead of payment_month, we need to make
-- payment_month nullable to allow new payments without the legacy field.
-- ============================================================================

-- Step 1: Make payment_month nullable
ALTER TABLE public.fee_payments
  ALTER COLUMN payment_month DROP NOT NULL;

-- Step 2: Drop the old unique constraint (already done in migration 015, but just in case)
ALTER TABLE public.fee_payments
  DROP CONSTRAINT IF EXISTS fee_payments_user_id_payment_month_installment_number_key;

-- Step 3: Verify the change
DO $$
DECLARE
  nullable_status TEXT;
BEGIN
  SELECT c.is_nullable INTO nullable_status
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'fee_payments'
    AND c.column_name = 'payment_month';
  
  IF nullable_status = 'YES' THEN
    RAISE NOTICE '✅ payment_month is now nullable';
  ELSE
    RAISE WARNING '⚠️  payment_month is still NOT NULL';
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PAYMENT_MONTH NULLABLE FIX COMPLETED!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  • payment_month is now nullable (optional)';
  RAISE NOTICE '  • New payments use mess_period_id (required)';
  RAISE NOTICE '  • Legacy payments keep payment_month for reference';
  RAISE NOTICE '';
  RAISE NOTICE 'Owners can now:';
  RAISE NOTICE '  • Add fee payments linked to mess periods';
  RAISE NOTICE '  • Payments work across calendar month boundaries';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
