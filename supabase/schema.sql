-- GOKUL MESS MANAGEMENT SYSTEM SCHEMA
-- Based on SRS Phase 3.1

-- 1. USERS TABLE (Extends Supabase Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  full_name text not null,
  unique_short_id serial unique, -- 3-digit ID (e.g., 101)
  photo_url text,
  phone text,
  address text,
  meal_plan text check (meal_plan in ('L', 'D', 'DL')) default 'DL', -- L=Lunch, D=Dinner, DL=Both
  role text check (role in ('STUDENT', 'OWNER')) default 'STUDENT',
  subscription_start_date timestamp with time zone,
  subscription_end_date timestamp with time zone,
  is_active boolean default true,
  -- Per-student permission controls
  profile_edit_allowed boolean default false,
  photo_update_allowed boolean default false,
  editable_fields text[] default '{}', -- Array of field names: ['full_name', 'phone', 'address']
  permission_expires_at timestamp with time zone, -- When temporary permissions expire
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

create policy "Owners can insert logs for any student" on public.daily_logs
  for insert with check (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

create policy "Owners can update any logs" on public.daily_logs
  for update using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

create policy "Owners can delete any logs" on public.daily_logs
  for delete using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

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

create policy "Owners can view all leaves" on public.leaves
  for select using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

create policy "Students can view their own leaves" on public.leaves
  for select using ( auth.uid() = user_id );

create policy "Students can insert their own leaves" on public.leaves
  for insert with check ( auth.uid() = user_id );

create policy "Owners can update any leaves" on public.leaves
  for update using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

create policy "Owners can delete any leaves" on public.leaves
  for delete using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

-- 4. TRANSACTIONS
create table public.transactions (
  txn_id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  amount decimal(10, 2) not null,
  payment_mode text check (payment_mode in ('UPI', 'CASH')),
  timestamp timestamp with time zone default now()
);

alter table public.transactions enable row level security;

create policy "Owners can view all transactions" on public.transactions
  for select using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

create policy "Students can view their own transactions" on public.transactions
  for select using ( auth.uid() = user_id );

create policy "Owners can insert transactions" on public.transactions
  for insert with check (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

create policy "Owners can update any transactions" on public.transactions
  for update using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

-- 6. PARCEL OTPS (For delegate parcel collection)
create table public.parcel_otps (
  otp_id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  otp_code text not null,
  expires_at timestamp with time zone not null,
  is_used boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.parcel_otps enable row level security;

create policy "Students can view their own OTPs" on public.parcel_otps
  for select using ( auth.uid() = user_id );

create policy "Students can insert their own OTPs" on public.parcel_otps
  for insert with check ( auth.uid() = user_id );

create policy "Owners can view all OTPs" on public.parcel_otps
  for select using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

create policy "Owners can update any OTPs" on public.parcel_otps
  for update using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

-- 5. STORAGE BUCKET (For Photos)
-- Note: You must create a bucket named 'avatars' in the Supabase Dashboard Storage section.
