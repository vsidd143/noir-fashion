-- ====================================================================
-- NOIR LUXURY MIGRATION: 20261110_03_lock_down_catalog_and_coupons_rls.sql
-- Description: Locks down catalog CRUD, drops insecure FOR ALL USING (true) policies,
--              protects coupons from public enumeration, and isolates user records.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. CATEGORIES RLS
-- --------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins have full control on categories" ON public.categories;

CREATE POLICY "Categories are readable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins have full control on categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- 2. PRODUCTS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Published products are readable by everyone" ON public.products;
DROP POLICY IF EXISTS "Admins have full control on products" ON public.products;

-- Public can view only published, non-archived products; admins can view all
CREATE POLICY "Published products are readable by everyone"
  ON public.products FOR SELECT
  USING ((is_published = true AND is_archived = false) OR public.is_admin());

-- Strictly admins can insert, update, or delete products
CREATE POLICY "Admins have full control on products"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- 3. PRODUCT IMAGES RLS
-- --------------------------------------------------------------------
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on product images" ON public.product_images;
DROP POLICY IF EXISTS "Product images are readable by everyone" ON public.product_images;
DROP POLICY IF EXISTS "Admins have full control on images" ON public.product_images;

CREATE POLICY "Product images are readable by everyone"
  ON public.product_images FOR SELECT
  USING (true);

CREATE POLICY "Admins have full control on images"
  ON public.product_images FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- 4. PRODUCT VARIANTS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Variants are readable by everyone" ON public.product_variants;
DROP POLICY IF EXISTS "Admins have full control on variants" ON public.product_variants;

CREATE POLICY "Variants are readable by everyone"
  ON public.product_variants FOR SELECT
  USING (true);

CREATE POLICY "Admins have full control on variants"
  ON public.product_variants FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- 5. COUPONS RLS & SECURE VALIDATION RPC
-- --------------------------------------------------------------------
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coupons can be queried for validation" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins have full control on coupons" ON public.coupons;

-- Public cannot list coupons; only administrators can select or manage coupons directly
CREATE POLICY "Admins have full control on coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Ensure core coupons exist in table
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, is_active)
VALUES 
  ('NOIR10', 'percentage', 10.00, 0.00, true),
  ('VIP20', 'percentage', 20.00, 10000.00, true)
ON CONFLICT (code) DO NOTHING;

-- Public RPC for safe client-side single coupon check without revealing coupon list
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT, p_subtotal NUMERIC DEFAULT 0.00)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_coupon RECORD;
  v_discount NUMERIC(10,2) := 0.00;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Please enter a coupon code.');
  END IF;

  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE upper(trim(code)) = upper(trim(p_code))
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid or inactive coupon code.');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has expired.');
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.times_used >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has reached its maximum usage limit.');
  END IF;

  IF v_coupon.min_order_amount > 0 AND p_subtotal < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', format('Coupon requires a minimum order of ₹%s', v_coupon.min_order_amount)
    );
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := round((p_subtotal * (v_coupon.discount_value / 100.0)), 2);
    IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
      v_discount := v_coupon.max_discount_amount;
    END IF;
  ELSE
    v_discount := LEAST(p_subtotal, v_coupon.discount_value);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'message', format('Coupon %s applied: %s%s OFF', v_coupon.code, v_coupon.discount_value, CASE WHEN v_coupon.discount_type = 'percentage' THEN '%' ELSE ' ₹' END)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, NUMERIC) TO authenticated, anon;

-- --------------------------------------------------------------------
-- 6. ORDERS, ORDER ITEMS, WISHLIST & ADDRESSES STRICT ISOLATION
-- --------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders (guests or customers)" ON public.orders;
DROP POLICY IF EXISTS "Customers can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins have full control on orders" ON public.orders;

CREATE POLICY "Orders select policy" ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins have full control on orders" ON public.orders
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Order Items
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins have full control on order items" ON public.order_items;

CREATE POLICY "Order items select policy" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Admins have full control on order items" ON public.order_items
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Wishlist Items
DROP POLICY IF EXISTS "Users manage their own wishlist" ON public.wishlist_items;

CREATE POLICY "Wishlist items policy" ON public.wishlist_items
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

