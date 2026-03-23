-- Add meal plan pricing columns to mess_settings
ALTER TABLE public.mess_settings
  ADD COLUMN IF NOT EXISTS lunch_price integer NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS dinner_price integer NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS both_price integer NOT NULL DEFAULT 3000;

COMMENT ON COLUMN public.mess_settings.lunch_price IS 'Monthly price for Lunch-only plan (₹)';
COMMENT ON COLUMN public.mess_settings.dinner_price IS 'Monthly price for Dinner-only plan (₹)';
COMMENT ON COLUMN public.mess_settings.both_price IS 'Monthly price for Lunch+Dinner plan (₹)';
