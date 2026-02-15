-- GOKUL MESS MANAGEMENT SYSTEM SCHEMA
-- Based on SRS Phase 3.1

-- 1. USERS TABLE (Extends Supabase Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  full_name text not null,
  unique_short_id serial unique, -- 3-digit ID (e.g., 101)
  photo_url text,
  role text check (role in ('STUDENT', 'OWNER')) default 'STUDENT',
  subscription_end_date timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone" on public.users
  for select using (true);

create policy "Users can insert their own profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Owners can update any profile" on public.users
  for update using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'OWNER'
    )
  );

-- 2. DAILY LOGS (The "No-Lag" System)
create table public.daily_logs (
  log_id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  date date default CURRENT_DATE,
  meal_type text check (meal_type in ('LUNCH', 'DINNER')),
  status text check (status in ('CONSUMED', 'SKIPPED', 'LEAVE')) default 'CONSUMED',
  access_method text check (access_method in ('SELF_ID', 'PARCEL_OTP')) default 'SELF_ID',
  created_at timestamp with time zone default now()
);

-- Realtime is essential for Owner Dashboard
alter publication supabase_realtime add table public.daily_logs;

-- Enable RLS
alter table public.daily_logs enable row level security;

create policy "Owners can view all logs" on public.daily_logs
  for select using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

create policy "Students can view their own logs" on public.daily_logs
  for select using ( auth.uid() = user_id );

-- 3. LEAVES (Subscription Management)
create table public.leaves (
  leave_id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  start_date date not null,
  end_date date not null,
  is_approved boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.leaves enable row level security;

-- 4. TRANSACTIONS
create table public.transactions (
  txn_id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  amount decimal(10, 2) not null,
  payment_mode text check (payment_mode in ('UPI', 'CASH')),
  timestamp timestamp with time zone default now()
);

alter table public.transactions enable row level security;

-- 5. STORAGE BUCKET (For Photos)
-- Note: You must create a bucket named 'avatars' in the Supabase Dashboard Storage section.
