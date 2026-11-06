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
