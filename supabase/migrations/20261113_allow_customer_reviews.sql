-- ====================================================================
-- MIGRATION: Customer Reviews & Real Rating Normalization
-- ====================================================================

-- 1. Ensure reviews table exists with all required fields
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public can read all reviews
DROP POLICY IF EXISTS "Reviews are readable by everyone" ON public.reviews;
CREATE POLICY "Reviews are readable by everyone"
  ON public.reviews FOR SELECT USING (true);

-- 4. Policy: Allow customers (authenticated and guests) to submit reviews
DROP POLICY IF EXISTS "Customers can submit reviews" ON public.reviews;
CREATE POLICY "Customers can submit reviews"
  ON public.reviews FOR INSERT WITH CHECK (true);

-- 5. Policy: Admins can delete or moderate reviews
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Admins can manage reviews"
  ON public.reviews FOR ALL USING (public.is_admin());

-- 6. Reset default rating on products table to 0 (no fake 5.0)
ALTER TABLE public.products ALTER COLUMN rating SET DEFAULT 0;

-- 7. Clean up any existing unreviewed products that had fake 5.0 rating
UPDATE public.products 
SET rating = 0 
WHERE reviews_count = 0 OR reviews_count IS NULL;

