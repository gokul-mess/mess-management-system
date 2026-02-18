-- FIX RLS POLICIES FOR OWNER PERMISSIONS
-- Run this in Supabase SQL Editor to fix the "Permission Denied" error

-- ============================================
-- 1. FIX DAILY_LOGS TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can insert logs for any student" ON public.daily_logs;
DROP POLICY IF EXISTS "Owners can update any logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Owners can delete any logs" ON public.daily_logs;

-- Add missing INSERT policy for owners
CREATE POLICY "Owners can insert logs for any student" ON public.daily_logs
  FOR INSERT WITH CHECK (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- Add UPDATE policy for owners
CREATE POLICY "Owners can update any logs" ON public.daily_logs
  FOR UPDATE USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- Add DELETE policy for owners
CREATE POLICY "Owners can delete any logs" ON public.daily_logs
  FOR DELETE USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- ============================================
-- 2. FIX LEAVES TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can view all leaves" ON public.leaves;
DROP POLICY IF EXISTS "Students can view their own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Students can insert their own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Owners can update any leaves" ON public.leaves;
DROP POLICY IF EXISTS "Owners can delete any leaves" ON public.leaves;

-- Add complete policies for leaves
CREATE POLICY "Owners can view all leaves" ON public.leaves
  FOR SELECT USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

CREATE POLICY "Students can view their own leaves" ON public.leaves
  FOR SELECT USING ( auth.uid() = user_id );

CREATE POLICY "Students can insert their own leaves" ON public.leaves
  FOR INSERT WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Owners can update any leaves" ON public.leaves
  FOR UPDATE USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

CREATE POLICY "Owners can delete any leaves" ON public.leaves
  FOR DELETE USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- ============================================
-- 3. FIX TRANSACTIONS TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Students can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Owners can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Owners can update any transactions" ON public.transactions;

-- Add complete policies for transactions
CREATE POLICY "Owners can view all transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

CREATE POLICY "Students can view their own transactions" ON public.transactions
  FOR SELECT USING ( auth.uid() = user_id );

CREATE POLICY "Owners can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

CREATE POLICY "Owners can update any transactions" ON public.transactions
  FOR UPDATE USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- ============================================
-- 4. CREATE PARCEL_OTPS TABLE (if not exists)
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.parcel_otps (
  otp_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  is_used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parcel_otps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own OTPs" ON public.parcel_otps;
DROP POLICY IF EXISTS "Students can insert their own OTPs" ON public.parcel_otps;
DROP POLICY IF EXISTS "Owners can view all OTPs" ON public.parcel_otps;
DROP POLICY IF EXISTS "Owners can update any OTPs" ON public.parcel_otps;

-- Add policies for parcel_otps
CREATE POLICY "Students can view their own OTPs" ON public.parcel_otps
  FOR SELECT USING ( auth.uid() = user_id );

CREATE POLICY "Students can insert their own OTPs" ON public.parcel_otps
  FOR INSERT WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Owners can view all OTPs" ON public.parcel_otps
  FOR SELECT USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

CREATE POLICY "Owners can update any OTPs" ON public.parcel_otps
  FOR UPDATE USING (
    EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER' )
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify the policies are created correctly:

-- Check daily_logs policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'daily_logs'
ORDER BY policyname;

-- Check leaves policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'leaves'
ORDER BY policyname;

-- Check transactions policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- Check parcel_otps policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'parcel_otps'
ORDER BY policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been successfully updated!';
  RAISE NOTICE 'Owners can now:';
  RAISE NOTICE '  - Insert meal logs (daily_logs)';
  RAISE NOTICE '  - Update/delete logs';
  RAISE NOTICE '  - Manage leaves';
  RAISE NOTICE '  - Manage transactions';
  RAISE NOTICE '  - View parcel OTPs';
  RAISE NOTICE '';
  RAISE NOTICE 'Students can now:';
  RAISE NOTICE '  - Submit leave requests';
  RAISE NOTICE '  - Generate parcel OTPs';
  RAISE NOTICE '  - View their own data';
END $$;
