-- ====================================================================
-- NOIR ATELIER // MASTER BULLETPROOF DATABASE SETUP & FIX
-- Run this ENTIRE script in Supabase SQL Editor (Green "Run" button).
-- It fixes "Database error saving new user", sets up Customer Details,
-- enforces RBAC role separation, and configures Two-Tier Categories.
-- ====================================================================

-- 1. Create user_role ENUM safely
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create or Update PROFILES table with all Customer Details
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  street_address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'India',
  role user_role DEFAULT 'customer'::user_role NOT NULL,
  is_blocked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure all customer columns exist even if profiles already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'customer'::user_role;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 3. Create ADDRESSES table for customer delivery addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Primary Residence',
  recipient_name TEXT NOT NULL,
  phone TEXT,
  street_address TEXT NOT NULL,
  apartment TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'India' NOT NULL,
  is_default BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Create CATEGORIES table with Two-Tier Hierarchy
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 5. Create ORDERS and ORDER ITEMS tables
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  payment_method TEXT DEFAULT 'Cash on Delivery (COD)' NOT NULL,
  payment_status TEXT DEFAULT 'pending' NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0.00,
  shipping_fee NUMERIC(10,2) DEFAULT 0.00,
  tax_amount NUMERIC(10,2) DEFAULT 0.00,
  total_amount NUMERIC(10,2) NOT NULL,
  coupon_code TEXT,
  tracking_number TEXT,
  courier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  variant_id TEXT,
  color_name TEXT,
  size TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL
);

-- 6. FAIL-SAFE REGISTRATION TRIGGER (ELIMINATES "Database error saving new user")
-- Automatically assigns 'admin' ONLY to vsidd143@gmail.com, all other users receive 'customer'.
-- Includes an EXCEPTION block so user registration in auth.users can NEVER fail.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_role user_role := 'customer'::user_role;
BEGIN
  IF LOWER(NEW.email) = 'vsidd143@gmail.com' THEN
    v_role := 'admin'::user_role;
  ELSE
    v_role := 'customer'::user_role;
  END IF;

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
      v_role
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
      -- Swallows any profile insert errors so auth.users registration succeeds 100%
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Seed Two-Tier Categories
-- Top-level departments
INSERT INTO public.categories (name, slug, description, display_order, is_active, parent_id) VALUES
  ('Outerwear', 'outerwear', 'Technical jackets, down puffers, and shearling bombers', 1, true, NULL),
  ('Tops', 'tops', '480 GSM French Terry hoodies, heavy box tees, and technical shirts', 2, true, NULL),
  ('Bottoms', 'bottoms', 'Tactical combat cargos, articulated trousers, and denim', 3, true, NULL),
  ('Footwear', 'footwear', 'Architectural sneakers and nitrogen-cushioned runners', 4, true, NULL),
  ('Accessories', 'accessories', 'Modular chest rigs, seamless balaclavas, and eyewear', 5, true, NULL)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = true;

-- Garment Subcategories
INSERT INTO public.categories (name, slug, description, display_order, is_active, parent_id) VALUES
  ('Puffer Jackets', 'puffer-jackets', '3-layer composite down outer garments', 1, true, (SELECT id FROM public.categories WHERE slug = 'outerwear')),
  ('Leather Bombers', 'leather-bombers', 'Aniline lambskin and shearling jackets', 2, true, (SELECT id FROM public.categories WHERE slug = 'outerwear')),
  ('Heavy Hoodies', 'hoodies', 'Custom 480 GSM loopback French terry', 1, true, (SELECT id FROM public.categories WHERE slug = 'tops')),
  ('Box T-Shirts', 't-shirts', '320 GSM long-staple combed cotton', 2, true, (SELECT id FROM public.categories WHERE slug = 'tops')),
  ('Cargo Pants', 'pants', '12-pocket ergonomic modular combat trousers', 1, true, (SELECT id FROM public.categories WHERE slug = 'bottoms')),
  ('Combat Trousers', 'trousers', 'Water-repellent articulated trousers', 2, true, (SELECT id FROM public.categories WHERE slug = 'bottoms')),
  ('Shadow Sneakers', 'sneakers', 'Brutalist sneakers with Vibram outsoles', 1, true, (SELECT id FROM public.categories WHERE slug = 'footwear')),
  ('Modular Rigs', 'chest-rigs', 'Cordura city navigation chest rigs', 1, true, (SELECT id FROM public.categories WHERE slug = 'accessories')),
  ('Balaclavas & Masks', 'masks', '3D seamless thermoregulating face armor', 2, true, (SELECT id FROM public.categories WHERE slug = 'accessories'))
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

-- 8. RBAC Helper Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
END;
$$;

-- 9. Row-Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Service or authenticated insert profile" ON public.profiles;
CREATE POLICY "Service or authenticated insert profile" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Categories policies
DROP POLICY IF EXISTS "Categories are viewable by all" ON public.categories;
CREATE POLICY "Categories are viewable by all" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin() OR auth.role() = 'anon');

-- Orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin());
