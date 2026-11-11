-- ====================================================================
-- NOIR ATELIER — PART 1: CORE TABLES, RLS POLICIES & ADMIN TRIGGER
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role user_role DEFAULT 'customer' NOT NULL,
  is_blocked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  material TEXT,
  fit TEXT,
  weight_gsm INT,
  is_published BOOLEAN DEFAULT true NOT NULL,
  is_featured BOOLEAN DEFAULT false NOT NULL,
  is_new_arrival BOOLEAN DEFAULT true NOT NULL,
  is_best_seller BOOLEAN DEFAULT false NOT NULL,
  is_limited BOOLEAN DEFAULT false NOT NULL,
  edition_count INT,
  rating NUMERIC(3,2) DEFAULT 5.0,
  reviews_count INT DEFAULT 0,
  details TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  size TEXT NOT NULL,
  sku TEXT UNIQUE,
  stock_quantity INT NOT NULL DEFAULT 10,
  price_modifier NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. ORDERS TABLE (Cash on Delivery enabled by default)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  status order_status DEFAULT 'pending' NOT NULL,
  payment_method TEXT DEFAULT 'Cash on Delivery (COD)' NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
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

-- 9. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  color_name TEXT,
  size TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL
);

-- 10. CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  color_name TEXT,
  size TEXT,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_product_variant UNIQUE (user_id, product_id, color_name, size)
);

-- 11. WISHLIST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_wishlist UNIQUE (user_id, product_id)
);

-- 12. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0.00,
  max_discount_amount NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMPTZ,
  usage_limit INT,
  times_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 13. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Home',
  recipient_name TEXT NOT NULL,
  phone TEXT,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'France',
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 14. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 15. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  store_name TEXT DEFAULT 'NOIR ATELIER',
  support_email TEXT DEFAULT 'contact@atelier-noir.com',
  enable_cod BOOLEAN DEFAULT true NOT NULL,
  enable_stripe BOOLEAN DEFAULT false NOT NULL,
  enable_razorpay BOOLEAN DEFAULT false NOT NULL,
  free_shipping_threshold NUMERIC(10,2) DEFAULT 0.00,
  standard_shipping_fee NUMERIC(10,2) DEFAULT 0.00,
  tax_percentage NUMERIC(5,2) DEFAULT 0.00,
  banner_announcement TEXT DEFAULT 'COMPLIMENTARY WORLDWIDE EXPRESS DELIVERY // EDITION 07',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO public.store_settings (id, store_name, enable_cod)
VALUES ('global', 'NOIR ATELIER', true)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Admin Helper Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_blocked = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full control over profiles" ON public.profiles;
CREATE POLICY "Admins have full control over profiles"
  ON public.profiles FOR ALL USING (public.is_admin());

-- Categories Policies
DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
CREATE POLICY "Categories are readable by everyone"
  ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins have full control on categories" ON public.categories;
CREATE POLICY "Admins have full control on categories"
  ON public.categories FOR ALL USING (public.is_admin());

-- Products Policies
DROP POLICY IF EXISTS "Published products are readable by everyone" ON public.products;
CREATE POLICY "Published products are readable by everyone"
  ON public.products FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins have full control on products" ON public.products;
CREATE POLICY "Admins have full control on products"
  ON public.products FOR ALL USING (public.is_admin());

-- Product Images Policies
DROP POLICY IF EXISTS "Product images are readable by everyone" ON public.product_images;
CREATE POLICY "Product images are readable by everyone"
  ON public.product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins have full control on images" ON public.product_images;
CREATE POLICY "Admins have full control on images"
  ON public.product_images FOR ALL USING (public.is_admin());

-- Product Variants Policies
DROP POLICY IF EXISTS "Variants are readable by everyone" ON public.product_variants;
CREATE POLICY "Variants are readable by everyone"
  ON public.product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins have full control on variants" ON public.product_variants;
CREATE POLICY "Admins have full control on variants"
  ON public.product_variants FOR ALL USING (public.is_admin());

-- Orders Policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Anyone can create orders (guests or customers)" ON public.orders;
CREATE POLICY "Anyone can create orders (guests or customers)"
  ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins have full control on orders" ON public.orders;
CREATE POLICY "Admins have full control on orders"
  ON public.orders FOR ALL USING (public.is_admin());

-- Order Items Policies
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items"
  ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins have full control on order items" ON public.order_items;
CREATE POLICY "Admins have full control on order items"
  ON public.order_items FOR ALL USING (public.is_admin());

-- Cart Policies
DROP POLICY IF EXISTS "Users manage their own cart" ON public.cart_items;
CREATE POLICY "Users manage their own cart"
  ON public.cart_items FOR ALL USING (auth.uid() = user_id);

-- Wishlist Policies
DROP POLICY IF EXISTS "Users manage their own wishlist" ON public.wishlist_items;
CREATE POLICY "Users manage their own wishlist"
  ON public.wishlist_items FOR ALL USING (auth.uid() = user_id);

-- Addresses Policies
DROP POLICY IF EXISTS "Users manage their own addresses" ON public.addresses;
CREATE POLICY "Users manage their own addresses"
  ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- Reviews Policies
DROP POLICY IF EXISTS "Reviews are readable by everyone" ON public.reviews;
CREATE POLICY "Reviews are readable by everyone"
  ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON public.reviews;
CREATE POLICY "Authenticated users can submit reviews"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Admins can manage reviews"
  ON public.reviews FOR ALL USING (public.is_admin());

-- Coupons Policies
DROP POLICY IF EXISTS "Coupons can be queried for validation" ON public.coupons;
CREATE POLICY "Coupons can be queried for validation"
  ON public.coupons FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL USING (public.is_admin());

-- Store Settings Policies
DROP POLICY IF EXISTS "Store settings are readable by everyone" ON public.store_settings;
CREATE POLICY "Store settings are readable by everyone"
  ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;
CREATE POLICY "Admins can update store settings"
  ON public.store_settings FOR ALL USING (public.is_admin());

-- ====================================================================
-- AUTOMATIC TRIGGER: USER REGISTRATION & ADMIN PROMOTION
-- ====================================================================

-- Ensure all customer detail columns exist on profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT := 'customer';
BEGIN
  -- Automatically assign admin role if the registered email matches vsidd143@gmail.com
  IF LOWER(NEW.email) = 'vsidd143@gmail.com' THEN
    v_role := 'admin';
  END IF;

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
    NEW.raw_user_meta_data->>'country',
    v_role::user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    role = CASE WHEN LOWER(NEW.email) = 'vsidd143@gmail.com' THEN 'admin'::user_role ELSE public.profiles.role END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail-safe: Prevent trigger errors from ever blocking user registration
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ====================================================================
-- NOIR ATELIER — STEP 2: CATEGORIES, PRODUCTS, IMAGES & COUPONS
-- ====================================================================

-- 1. Categories
INSERT INTO public.categories (name, slug, description, display_order) VALUES
  ('Hoodies', 'hoodies', 'Heavyweight French Terry', 1),
  ('Jackets', 'jackets', 'Technical outerwear', 2),
  ('Cargo Pants', 'pants', 'Combat ripstop product', 3),
  ('T-Shirts', 't-shirts', '320 GSM heavy box tees', 4),
  ('Footwear', 'footwear', 'Architectural sneakers', 5),
  ('Accessories', 'accessories', 'Modular tactical gear', 6)
ON CONFLICT (slug) DO NOTHING;

-- 2. Coupons
INSERT INTO public.coupons (code, discount_type, discount_value) VALUES
  ('NOIR10', 'percentage', 10),
  ('VIP20', 'percentage', 20)
ON CONFLICT (code) DO NOTHING;

-- 3. Products
INSERT INTO public.products (slug, name, subtitle, description, category_id, price, original_price, material, fit, is_featured, is_new_arrival, rating, reviews_count) VALUES
  ('noir-phantom-hoodie', 'PHANTOM OVERSIZED HOODIE', 'Heavyweight 480 GSM French Terry', 'Crafted from custom 480 GSM loopback French terry with titanium hardware.', (SELECT id FROM public.categories WHERE slug = 'hoodies'), 380, 450, '100% Organic French Terry', 'Oversized Boxy Silhouette', true, true, 4.9, 128),
  ('noir-shadow-sneaker', 'SHADOW RUNNER V2 SNEAKER', 'Nitrogen-Infused Architectural Sneaker', 'Avant-garde brutalist footwear with supercritical nitrogen foam and Vibram outsole.', (SELECT id FROM public.categories WHERE slug = 'footwear'), 520, 580, 'Cordura Mesh / Italian Calfskin', 'True to Size', true, true, 5.0, 94),
  ('noir-exoskeleton-jacket', 'EXOSKELETON PUFFER JACKET', '3-Layer Dyneema Composite Shell', 'Ultra-lightweight Dyneema exterior and 850 fill-power white goose down.', (SELECT id FROM public.categories WHERE slug = 'jackets'), 890, 980, 'Dyneema Composite / 850 Goose Down', 'Modular Oversized Fit', true, true, 4.9, 87),
  ('noir-atelier-cargo-pant', 'TACTICAL MODULAR CARGO PANTS', 'Water-Repellent Stretch Combat Twill', '12-pocket ergonomic layout with magnetic Fidlock buckle adjusters.', (SELECT id FROM public.categories WHERE slug = 'pants'), 420, 480, 'Schoeller Dryskin 4-Way Stretch', 'Tapered Ergonomic Combat Fit', true, true, 4.8, 112),
  ('noir-monolith-heavy-tee', 'MONOLITH HEAVY BOX T-SHIRT', '320 GSM Long-Staple Combed Cotton', 'Dense 320 GSM structure providing a clean architectural drape.', (SELECT id FROM public.categories WHERE slug = 't-shirts'), 180, 210, '100% GOTS Certified Cotton', 'Structured Relaxed Box Cut', true, true, 4.8, 142),
  ('noir-solstice-leather-bomber', 'SOLSTICE LEATHER BOMBER', 'Vegetable-Tanned Calfskin with Merino', 'Handcrafted Italian lambskin with Australian Merino shearling collar.', (SELECT id FROM public.categories WHERE slug = 'jackets'), 1450, 1650, 'Italian Aniline Lambskin / Merino Wool', 'Tailored Bomber Silhouette', true, true, 5.0, 48),
  ('noir-cipher-vest', 'CIPHER MULTI-POCKET CHEST RIG', 'Cordura Modular Tactical Rig', 'Functional city navigation harness with magnetic breakaway fasteners.', (SELECT id FROM public.categories WHERE slug = 'accessories'), 240, 290, '500D Cordura Nylon', 'Universal Fit', true, true, 4.7, 63),
  ('noir-cyber-mask', 'AURA CYBER BALACLAVA', 'Seamless Merino Wool Face Armor', 'Circular 3D knit with antibacterial silver ion thread and thermoregulation.', (SELECT id FROM public.categories WHERE slug = 'accessories'), 140, 180, '90% Merino Wool / 10% Silver Ion', 'Ergonomic Contoured Snug Fit', true, true, 4.9, 78)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- 4. Product Images
INSERT INTO public.product_images (product_id, url, is_primary, display_order) VALUES
  ((SELECT id FROM public.products WHERE slug = 'noir-phantom-hoodie'), 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85', true, 1),
  ((SELECT id FROM public.products WHERE slug = 'noir-phantom-hoodie'), 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=85', false, 2),
  ((SELECT id FROM public.products WHERE slug = 'noir-shadow-sneaker'), 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85', true, 1),
  ((SELECT id FROM public.products WHERE slug = 'noir-shadow-sneaker'), 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=1200&q=85', false, 2),
  ((SELECT id FROM public.products WHERE slug = 'noir-exoskeleton-jacket'), 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1200&q=85', true, 1),
  ((SELECT id FROM public.products WHERE slug = 'noir-exoskeleton-jacket'), 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1200&q=85', false, 2),
  ((SELECT id FROM public.products WHERE slug = 'noir-atelier-cargo-pant'), 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85', true, 1),
  ((SELECT id FROM public.products WHERE slug = 'noir-atelier-cargo-pant'), 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85', false, 2),
  ((SELECT id FROM public.products WHERE slug = 'noir-monolith-heavy-tee'), 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85', true, 1),
  ((SELECT id FROM public.products WHERE slug = 'noir-monolith-heavy-tee'), 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85', false, 2),
  ((SELECT id FROM public.products WHERE slug = 'noir-solstice-leather-bomber'), 'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=1200&q=85', true, 1),
  ((SELECT id FROM public.products WHERE slug = 'noir-solstice-leather-bomber'), 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1200&q=85', false, 2),
  ((SELECT id FROM public.products WHERE slug = 'noir-cipher-vest'), 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1200&q=85', true, 1),
  ((SELECT id FROM public.products WHERE slug = 'noir-cipher-vest'), 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85', false, 2),
  ((SELECT id FROM public.products WHERE slug = 'noir-cyber-mask'), 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1200&q=85', true, 1)
ON CONFLICT DO NOTHING;

-- 5. Product Variants
INSERT INTO public.product_variants (product_id, color_name, color_hex, size, sku, stock_quantity) VALUES
  ((SELECT id FROM public.products WHERE slug = 'noir-phantom-hoodie'), 'Obsidian Black', '#0a0a0a', 'M', 'PH-BLK-M', 20),
  ((SELECT id FROM public.products WHERE slug = 'noir-phantom-hoodie'), 'Obsidian Black', '#0a0a0a', 'L', 'PH-BLK-L', 18),
  ((SELECT id FROM public.products WHERE slug = 'noir-phantom-hoodie'), 'Tokyo Gold', '#c5a46d', 'M', 'PH-GLD-M', 10),
  ((SELECT id FROM public.products WHERE slug = 'noir-shadow-sneaker'), 'Obsidian Stealth', '#0a0a0a', 'UK 7', 'SR-BLK-UK7', 12),
  ((SELECT id FROM public.products WHERE slug = 'noir-shadow-sneaker'), 'Obsidian Stealth', '#0a0a0a', 'UK 8', 'SR-BLK-UK8', 15),
  ((SELECT id FROM public.products WHERE slug = 'noir-shadow-sneaker'), 'Obsidian Stealth', '#0a0a0a', 'UK 9', 'SR-BLK-UK9', 14),
  ((SELECT id FROM public.products WHERE slug = 'noir-shadow-sneaker'), 'Obsidian Stealth', '#0a0a0a', 'UK 10', 'SR-BLK-UK10', 16),
  ((SELECT id FROM public.products WHERE slug = 'noir-exoskeleton-jacket'), 'Carbon Matte', '#080808', 'M', 'EXO-CARB-M', 11),
  ((SELECT id FROM public.products WHERE slug = 'noir-exoskeleton-jacket'), 'Carbon Matte', '#080808', 'L', 'EXO-CARB-L', 9),
  ((SELECT id FROM public.products WHERE slug = 'noir-atelier-cargo-pant'), 'Deep Obsidian', '#060606', '32', 'CARG-32', 15),
  ((SELECT id FROM public.products WHERE slug = 'noir-monolith-heavy-tee'), 'Pitch Black', '#050505', 'L', 'TEE-BLK-L', 28),
  ((SELECT id FROM public.products WHERE slug = 'noir-solstice-leather-bomber'), 'Matte Black', '#0c0c0c', 'L', 'SSB-BLK-L', 10),
  ((SELECT id FROM public.products WHERE slug = 'noir-cipher-vest'), 'Stealth Onyx', '#050505', 'One Size', 'CMR-BLK-OS', 25),
  ((SELECT id FROM public.products WHERE slug = 'noir-cyber-mask'), 'Obsidian', '#0a0a0a', 'One Size', 'MSK-OBS-OS', 40)
ON CONFLICT DO NOTHING;
