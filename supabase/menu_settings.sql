-- MESS MENU SETTINGS TABLE
create table public.mess_settings (
  id uuid default gen_random_uuid() primary key,
  menu_photo_url text,
  updated_at timestamp with time zone default now(),
  updated_by uuid references public.users
);

-- Enable RLS
alter table public.mess_settings enable row level security;

-- Policies
create policy "Everyone can view settings" on public.mess_settings
  for select using (true);

create policy "Owners can update settings" on public.mess_settings
  for update using (
    exists ( select 1 from public.users where id = auth.uid() and role = 'OWNER' )
  );

-- Insert default row (idempotent)
insert into public.mess_settings (id) 
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Storage bucket policy (Run this in Supabase Dashboard > Storage)
-- Create a bucket named 'menu-photos' with public access
