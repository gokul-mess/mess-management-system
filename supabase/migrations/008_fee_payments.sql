-- FEE PAYMENTS TABLE
-- Tracks monthly fee payments per student, supporting up to 2 installments

create table if not exists public.fee_payments (
  payment_id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  payment_month text not null, -- Format: 'YYYY-MM' e.g. '2025-06'
  installment_number int check (installment_number in (1, 2)) not null,
  amount decimal(10, 2) not null,
  payment_mode text check (payment_mode in ('UPI', 'CASH')) not null,
  paid_at timestamp with time zone default now(),
  note text,
  created_at timestamp with time zone default now(),
  unique (user_id, payment_month, installment_number)
);

alter table public.fee_payments enable row level security;

create policy "Owners can view all fee payments" on public.fee_payments
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'OWNER')
  );

create policy "Owners can insert fee payments" on public.fee_payments
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'OWNER')
  );

create policy "Owners can update fee payments" on public.fee_payments
  for update using (
    exists (select 1 from public.users where id = auth.uid() and role = 'OWNER')
  );

create policy "Owners can delete fee payments" on public.fee_payments
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and role = 'OWNER')
  );

create policy "Students can view their own fee payments" on public.fee_payments
  for select using (auth.uid() = user_id);

create index if not exists idx_fee_payments_user_month
  on public.fee_payments(user_id, payment_month);
