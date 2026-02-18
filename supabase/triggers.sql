-- TRIGGER: Auto-create profile in public.users on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, role, photo_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'STUDENT', -- Default role
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- TRIGGER: Auto-update is_active based on subscription_end_date
-- This function checks if subscription has expired and updates is_active accordingly
create or replace function public.update_user_active_status()
returns trigger as $$
begin
  -- If subscription_end_date is set and has passed, set is_active to false
  if new.subscription_end_date is not null and new.subscription_end_date < CURRENT_DATE then
    new.is_active := false;
  -- If subscription_end_date is set and is in the future, set is_active to true
  elsif new.subscription_end_date is not null and new.subscription_end_date >= CURRENT_DATE then
    new.is_active := true;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Trigger on INSERT or UPDATE of users table
create trigger check_subscription_status
  before insert or update of subscription_end_date
  on public.users
  for each row
  execute function public.update_user_active_status();

-- FUNCTION: Batch update all users' active status (run periodically)
-- This can be called by a cron job or manually to update all users at once
create or replace function public.batch_update_active_status()
returns void as $$
begin
  update public.users
  set is_active = false
  where subscription_end_date is not null 
    and subscription_end_date < CURRENT_DATE
    and is_active = true;
    
  update public.users
  set is_active = true
  where subscription_end_date is not null 
    and subscription_end_date >= CURRENT_DATE
    and is_active = false;
end;
$$ language plpgsql security definer;

-- Note: To run this function periodically, you can use pg_cron extension
-- or call it from your application on a schedule
-- Example: SELECT public.batch_update_active_status();
