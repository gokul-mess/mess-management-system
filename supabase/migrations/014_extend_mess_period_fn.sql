-- ============================================================================
-- ATOMIC MESS PERIOD EXTENSION FUNCTION
-- ============================================================================
-- Prevents race conditions when two leave approvals happen simultaneously.
-- Uses a row-level lock (SELECT ... FOR UPDATE) so concurrent calls queue
-- up rather than overwriting each other.
-- ============================================================================

CREATE OR REPLACE FUNCTION extend_mess_period(
  p_user_id   uuid,
  p_days      integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_end_date date;
BEGIN
  -- Lock the active row for this user so concurrent calls serialise
  SELECT end_date
    INTO v_end_date
    FROM public.mess_periods
   WHERE user_id  = p_user_id
     AND is_active = true
   FOR UPDATE;

  IF v_end_date IS NULL THEN
    RAISE EXCEPTION 'No active mess period found for user %', p_user_id;
  END IF;

  UPDATE public.mess_periods
     SET end_date = v_end_date + p_days
   WHERE user_id  = p_user_id
     AND is_active = true;
END;
$$;

-- Only owners (service role / authenticated owners) should call this
REVOKE ALL ON FUNCTION extend_mess_period(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION extend_mess_period(uuid, integer)
  TO authenticated;
