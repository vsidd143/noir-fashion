-- ====================================================================
-- NOIR ATELIER — MIGRATION 11: PRODUCT MANAGEMENT & DEPARTMENT TAXONOMY
-- Run this migration in Supabase SQL Editor to support dynamic
-- MEN, WOMEN, KIDS and NEW ARRIVALS product administration.
-- ====================================================================

-- 1. Ensure Department and Pricing Columns Exist on Products Table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'men';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS regular_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discounted_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT true NOT NULL;

-- 2. Backfill existing records if necessary
UPDATE public.products 
SET regular_price = COALESCE(regular_price, original_price, price),
    discounted_price = COALESCE(discounted_price, price)
WHERE regular_price IS NULL OR discounted_price IS NULL;

-- 3. Ensure Category Table Has Required Columns
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- 4. Seed Primary Department Categories in categories Table
INSERT INTO public.categories (name, slug, description, display_order, is_active) VALUES
  ('Men', 'men', 'Men''s Luxury Atelier Collection', 1, true),
  ('Women', 'women', 'Women''s Luxury Couture Collection', 2, true),
  ('Kids', 'kids', 'Kids'' Luxury Archive Collection', 3, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true;

-- 5. High-Performance Indexing for Fast Storefront Queries
CREATE INDEX IF NOT EXISTS idx_products_department ON public.products(department);
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON public.products(is_new_arrival) WHERE is_new_arrival = true;
CREATE INDEX IF NOT EXISTS idx_products_published_archived ON public.products(is_published, is_archived);
CREATE INDEX IF NOT EXISTS idx_products_created_desc ON public.products(created_at DESC);

-- 6. Row Level Security Policies for Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Drop obsolete or conflicting policies safely
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Published products are readable by everyone" ON public.products;
DROP POLICY IF EXISTS "Admins have full control on products" ON public.products;

-- Allow public read of non-archived published products
CREATE POLICY "Public read published products"
  ON public.products
  FOR SELECT
  USING (is_published = true AND is_archived = false);

-- Allow authenticated admins full access on products
CREATE POLICY "Admins full access products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_blocked = false)
    OR auth.email() = 'vsidd143@gmail.com'
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_blocked = false)
    OR auth.email() = 'vsidd143@gmail.com'
  );

-- Policies for product_images
DROP POLICY IF EXISTS "Public read product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins full access product images" ON public.product_images;

CREATE POLICY "Public read product images"
  ON public.product_images
  FOR SELECT
  USING (true);

CREATE POLICY "Admins full access product images"
  ON public.product_images
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_blocked = false)
    OR auth.email() = 'vsidd143@gmail.com'
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_blocked = false)
    OR auth.email() = 'vsidd143@gmail.com'
  );

-- Policies for product_variants
DROP POLICY IF EXISTS "Public read product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins full access product variants" ON public.product_variants;

CREATE POLICY "Public read product variants"
  ON public.product_variants
  FOR SELECT
  USING (true);

CREATE POLICY "Admins full access product variants"
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_blocked = false)
    OR auth.email() = 'vsidd143@gmail.com'
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_blocked = false)
    OR auth.email() = 'vsidd143@gmail.com'
  );

-- 7. Ensure Storage Bucket and Policies for product-media
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-media', 'product-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view product media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product media" ON storage.objects;

CREATE POLICY "Public can view product media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-media');

CREATE POLICY "Admins can upload product media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-media' AND
    (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_blocked = false)
      OR auth.email() = 'vsidd143@gmail.com'
    )
  );

CREATE POLICY "Admins can update product media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-media' AND
    (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_blocked = false)
      OR auth.email() = 'vsidd143@gmail.com'
    )
  );

CREATE POLICY "Admins can delete product media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-media' AND
    (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' AND is_blocked = false)
      OR auth.email() = 'vsidd143@gmail.com'
    )
  );

