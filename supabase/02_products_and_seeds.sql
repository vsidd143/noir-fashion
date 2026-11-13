-- ====================================================================
-- NOIR ATELIER — STEP 2: CATEGORIES, PRODUCTS (INR), IMAGES & COUPONS
-- Run this in Supabase SQL Editor
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

-- 2. Coupons (with Indian Rupee and VIP discounts)
INSERT INTO public.coupons (code, discount_type, discount_value) VALUES
  ('NOIR10', 'percentage', 10),
  ('VIP20', 'percentage', 20),
  ('INDIA1000', 'fixed', 1000)
ON CONFLICT (code) DO NOTHING;

-- 3. Products
-- NOTE: Default demo/seed products have been removed so your storefront only shows
-- real products created by you via the Admin Panel (http://localhost:3000/admin).
-- To purge existing demo/archived products from Supabase, run supabase/remove_all_archive_and_demo_products.sql
