-- ====================================================================
-- FORMA // FULL ADMIN CONTROL, TYPES, COLLECTIONS & STORAGE MIGRATION
-- Run this in Supabase SQL Editor.
-- Sets up Product Types, Collections, Storage bucket, and archives demo data.
-- ====================================================================

-- 1. Create PRODUCT_TYPES Table
CREATE TABLE IF NOT EXISTS public.product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create COLLECTIONS Table
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Enhance PRODUCTS Table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS regular_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discounted_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES public.product_types(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 4. OPTION B: SAFELY ARCHIVE ANY PREVIOUS DEMO PRODUCTS
-- They are unpublished and archived so historical orders retain integrity,
-- while the customer-facing storefront and active catalog are 100% clean.
UPDATE public.products 
SET is_archived = true, is_published = false 
WHERE slug IN (
  'noir-phantom-hoodie',
  'noir-shadow-sneaker',
  'noir-exoskeleton-jacket',
  'noir-atelier-cargo-pant',
  'noir-monolith-heavy-tee',
  'noir-solstice-leather-bomber',
  'noir-cipher-vest',
  'noir-cyber-mask'
);

-- 5. Seed Initial Product Types (Dynamic, can be edited/deleted by Admin)
INSERT INTO public.product_types (name, slug, description, display_order) VALUES
  ('T-Shirts', 't-shirts', 'Boxy and oversized combed cotton tees', 1),
  ('Hoodies', 'hoodies', 'Heavyweight French Terry dropped-shoulder hoodies', 2),
  ('Jackets', 'jackets', 'Technical outer shells, puffers, and bombers', 3),
  ('Trousers', 'trousers', 'Articulated combat trousers and tactical pants', 4),
  ('Jeans', 'jeans', 'Japanese raw selvedge and structural denim', 5),
  ('Sneakers', 'sneakers', 'Architectural brutalist footwear', 6),
  ('Accessories', 'accessories', 'Modular rigs, balaclavas, and eyewear', 7)
ON CONFLICT (slug) DO NOTHING;

-- 6. Seed Initial Collections (Dynamic, can be edited/deleted by Admin)
INSERT INTO public.collections (name, slug, description, display_order) VALUES
  ('Autumn-Winter Drop', 'autumn-winter', 'Heavyweight structured product for the colder months', 1),
  ('Monochrome Monolith', 'monochrome-monolith', 'Minimalist architectural product in absolute noir', 2),
  ('Cyber Runway', 'cyber-runway', 'High-performance technical fabrics with aerospace hardware', 3)
ON CONFLICT (slug) DO NOTHING;

-- 7. Row Level Security for New Tables
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Product types are viewable by everyone" ON public.product_types;
CREATE POLICY "Product types are viewable by everyone" ON public.product_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product types" ON public.product_types;
CREATE POLICY "Admins can manage product types" ON public.product_types
  FOR ALL USING (public.is_admin() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Collections are viewable by everyone" ON public.collections;
CREATE POLICY "Collections are viewable by everyone" ON public.collections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage collections" ON public.collections;
CREATE POLICY "Admins can manage collections" ON public.collections
  FOR ALL USING (public.is_admin() OR auth.role() = 'anon');

-- 8. Supabase Storage Bucket for Product Images
-- Creates the 'product-media' bucket if not already present
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-media', 'product-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DROP POLICY IF EXISTS "Public can view product media" ON storage.objects;
CREATE POLICY "Public can view product media" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-media');

DROP POLICY IF EXISTS "Admins can upload product media" ON storage.objects;
CREATE POLICY "Admins can upload product media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-media');

DROP POLICY IF EXISTS "Admins can update product media" ON storage.objects;
CREATE POLICY "Admins can update product media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-media');

DROP POLICY IF EXISTS "Admins can delete product media" ON storage.objects;
CREATE POLICY "Admins can delete product media" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-media');
