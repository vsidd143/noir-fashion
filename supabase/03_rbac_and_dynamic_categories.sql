-- ====================================================================
-- FORMA / NOIR ATELIER — RBAC HARDENING & DYNAMIC CATEGORIES MIGRATION
-- Run this in Supabase SQL Editor to enforce strict RBAC,
-- Two-Tier Category Taxonomy, and clean customer account isolation.
-- ====================================================================

-- 1. Ensure user_role Enum Exists
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Update Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 3. Update Categories Table with Hierarchy
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. Update Products Table for Subcategories
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 5. Seed Two-Tier Department & Garment Taxonomy
-- 5A. Top-Level Departments
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

-- 5B. Subcategories (Nested under Departments)
INSERT INTO public.categories (name, slug, description, display_order, is_active, parent_id) VALUES
  -- Outerwear Subcategories
  ('Puffer Jackets', 'puffer-jackets', '3-layer composite down outer garments', 1, true, (SELECT id FROM public.categories WHERE slug = 'outerwear')),
  ('Leather Bombers', 'leather-bombers', 'Aniline lambskin and shearling jackets', 2, true, (SELECT id FROM public.categories WHERE slug = 'outerwear')),
  ('Technical Shells', 'technical-shells', 'Waterproof taped seam shells', 3, true, (SELECT id FROM public.categories WHERE slug = 'outerwear')),
  -- Tops Subcategories
  ('Heavy Hoodies', 'hoodies', 'Custom 480 GSM loopback French terry', 1, true, (SELECT id FROM public.categories WHERE slug = 'tops')),
  ('Box T-Shirts', 't-shirts', '320 GSM long-staple combed cotton', 2, true, (SELECT id FROM public.categories WHERE slug = 'tops')),
  -- Bottoms Subcategories
  ('Cargo Pants', 'pants', '12-pocket ergonomic modular combat trousers', 1, true, (SELECT id FROM public.categories WHERE slug = 'bottoms')),
  ('Combat Trousers', 'trousers', 'Water-repellent articulated trousers', 2, true, (SELECT id FROM public.categories WHERE slug = 'bottoms')),
  -- Footwear Subcategories
  ('Shadow Sneakers', 'sneakers', 'Brutalist sneakers with Vibram outsoles', 1, true, (SELECT id FROM public.categories WHERE slug = 'footwear')),
  -- Accessories Subcategories
  ('Modular Rigs', 'chest-rigs', 'Cordura city navigation chest rigs', 1, true, (SELECT id FROM public.categories WHERE slug = 'accessories')),
  ('Balaclavas & Masks', 'masks', '3D seamless thermoregulating face armor', 2, true, (SELECT id FROM public.categories WHERE slug = 'accessories')),
  ('Cyber Eyewear', 'eyewear', 'Zeiss optical wrap shield sunglasses', 3, true, (SELECT id FROM public.categories WHERE slug = 'accessories'))
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

-- 6. STRICT SERVER-SIDE USER REGISTRATION TRIGGER
-- Public registrations are HARDCODED to 'customer'.
-- A public user CANNOT pass admin role in user_metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_role user_role := 'customer'::user_role;
BEGIN
  -- Strict Check: Only the designated master admin email receives admin role automatically
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
      country = COALESCE(EXCLUDED.country, public.profiles.country);
  EXCEPTION
    WHEN OTHERS THEN
      -- Fail-safe so user creation in auth.users is never aborted
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Helper admin check function
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

-- PROFILES Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- CATEGORIES Policies
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin());

-- PRODUCTS Policies
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products
  FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.is_admin());

-- ORDERS Policies: Strict Customer Isolation
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Customers can create own orders" ON public.orders;
CREATE POLICY "Customers can create own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin());

-- ADDRESSES Policies: Strict Customer Isolation
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
CREATE POLICY "Users can manage own addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);
