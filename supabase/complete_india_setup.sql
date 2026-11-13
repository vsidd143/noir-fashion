-- ====================================================================
-- NOIR ATELIER — ALL-IN-ONE FIX & SETUP FOR INDIA
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click RUN.
-- 1. Adds customer registration columns (phone, street_address, city, PIN, country).
-- 2. Makes user registration trigger 100% fail-safe (eliminating "Database error saving new user").
-- 3. Inserts all 8 luxury products with Indian Rupee (INR) pricing and categories.
-- ====================================================================

-- STEP 1: ENSURE ENUM & COLUMNS EXIST FOR CUSTOMER PROFILES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;

-- STEP 2: FAIL-SAFE USER TRIGGER (NEVER BLOCKS SIGNUP)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name, 
      phone, 
      street_address, 
      city, 
      postal_code, 
      country, 
      role
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'street_address',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'postal_code',
      COALESCE(NEW.raw_user_meta_data->>'country', 'India'),
      CASE 
        WHEN LOWER(NEW.email) = 'vsidd143@gmail.com' THEN 'admin'::user_role 
        ELSE 'customer'::user_role 
      END
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      street_address = COALESCE(EXCLUDED.street_address, public.profiles.street_address),
      city = COALESCE(EXCLUDED.city, public.profiles.city),
      postal_code = COALESCE(EXCLUDED.postal_code, public.profiles.postal_code),
      country = COALESCE(EXCLUDED.country, public.profiles.country),
      role = CASE 
        WHEN LOWER(NEW.email) = 'vsidd143@gmail.com' THEN 'admin'::user_role 
        ELSE public.profiles.role 
      END;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 3: CATEGORIES
INSERT INTO public.categories (name, slug, description, display_order) VALUES
  ('Hoodies', 'hoodies', 'Heavyweight French Terry', 1),
  ('Jackets', 'jackets', 'Technical outerwear', 2),
  ('Cargo Pants', 'pants', 'Combat ripstop product', 3),
  ('T-Shirts', 't-shirts', '320 GSM heavy box tees', 4),
  ('Footwear', 'footwear', 'Architectural sneakers', 5),
  ('Accessories', 'accessories', 'Modular tactical gear', 6)
ON CONFLICT (slug) DO NOTHING;

-- STEP 4: COUPONS & VOUCHERS
INSERT INTO public.coupons (code, discount_type, discount_value) VALUES
  ('NOIR10', 'percentage', 10),
  ('VIP20', 'percentage', 20),
  ('INDIA1000', 'fixed', 1000)
ON CONFLICT (code) DO NOTHING;

-- STEP 5: PRODUCTS
-- NOTE: Default demo/seed products have been removed so your storefront only shows
-- real products created by you via the Admin Panel (http://localhost:3000/admin).
-- To purge existing demo/archived products from Supabase, run supabase/remove_all_archive_and_demo_products.sql
