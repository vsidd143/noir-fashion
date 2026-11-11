-- ====================================================================
-- NOIR LUXURY ATELIER — COMPREHENSIVE FIX ROUND 1 & ADDRESS REPAIR
-- Project: tscfmyhglvsndnjgblhj
--
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR (Click "Run")
-- It applies:
-- 1. Country default fix (India)
-- 2. Anti-privilege escalation trigger on profiles
-- 3. Catalog lockdown (replaces dangerous FOR ALL USING (true))
-- 4. Coupons lockdown and secure validate_coupon RPC
-- 5. Address RLS restoration and atomic save_customer_address RPC
-- 6. Atomic order placement (place_order)
-- 7. Idempotent order cancellation with inventory restoration (cancel_order)
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. COUNTRY DEFAULT FIX
-- --------------------------------------------------------------------
ALTER TABLE public.addresses 
  ALTER COLUMN country SET DEFAULT 'India';

UPDATE public.addresses 
SET country = 'India' 
WHERE country = 'France';

-- --------------------------------------------------------------------
-- 2. UNAMBIGUOUS is_admin() HELPER & ANTI-PRIVILEGE ESCALATION
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_role text;
BEGIN
  IF v_caller IS NULL THEN
    RETURN false;
  END IF;

  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = v_caller AND is_blocked = false;

  RETURN COALESCE(v_role = 'admin', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role text;
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = user_id AND is_blocked = false;

  RETURN COALESCE(v_role = 'admin', false);
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role, anon;

-- Anti-Privilege Escalation Trigger on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_blocked IS DISTINCT FROM OLD.is_blocked) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Forbidden: You cannot modify account privileges or administrative roles.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles insert policy" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;
CREATE POLICY "Profiles delete policy" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- --------------------------------------------------------------------
-- 3. LOCK DOWN CATALOG & REMOVE UNSECURED POLICIES
-- --------------------------------------------------------------------
-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins have full control on categories" ON public.categories;

CREATE POLICY "Categories are readable by everyone"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins have full control on categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Published products are readable by everyone" ON public.products;
DROP POLICY IF EXISTS "Admins have full control on products" ON public.products;

CREATE POLICY "Published products are readable by everyone"
  ON public.products FOR SELECT
  USING ((is_published = true AND is_archived = false) OR public.is_admin());

CREATE POLICY "Admins have full control on products"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Product Images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on product images" ON public.product_images;
DROP POLICY IF EXISTS "Product images are readable by everyone" ON public.product_images;
DROP POLICY IF EXISTS "Admins have full control on images" ON public.product_images;

CREATE POLICY "Product images are readable by everyone"
  ON public.product_images FOR SELECT USING (true);

CREATE POLICY "Admins have full control on images"
  ON public.product_images FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Product Variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Variants are readable by everyone" ON public.product_variants;
DROP POLICY IF EXISTS "Admins have full control on variants" ON public.product_variants;

CREATE POLICY "Variants are readable by everyone"
  ON public.product_variants FOR SELECT USING (true);

CREATE POLICY "Admins have full control on variants"
  ON public.product_variants FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- 4. COUPONS TABLE LOCKDOWN & VALIDATION RPC
-- --------------------------------------------------------------------
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coupons can be queried for validation" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins have full control on coupons" ON public.coupons;

CREATE POLICY "Admins have full control on coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, is_active)
VALUES 
  ('NOIR10', 'percentage', 10.00, 0.00, true),
  ('VIP20', 'percentage', 20.00, 10000.00, true)
ON CONFLICT (code) DO NOTHING;

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
-- 5. ADDRESSES RLS RESTORATION & ATOMIC save_customer_address RPC
-- --------------------------------------------------------------------
-- Ensure all columns exist on addresses table before creating functions or policies
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.addresses ALTER COLUMN country SET DEFAULT 'India';

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Addresses select policy" ON public.addresses;
DROP POLICY IF EXISTS "Addresses insert policy" ON public.addresses;
DROP POLICY IF EXISTS "Addresses update policy" ON public.addresses;
DROP POLICY IF EXISTS "Addresses delete policy" ON public.addresses;

CREATE POLICY "Addresses select policy" ON public.addresses
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Addresses insert policy" ON public.addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Addresses update policy" ON public.addresses
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Addresses delete policy" ON public.addresses
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.save_customer_address(
  p_title TEXT,
  p_recipient_name TEXT,
  p_phone TEXT,
  p_house_number TEXT DEFAULT NULL,
  p_street_address TEXT DEFAULT NULL,
  p_locality TEXT DEFAULT NULL,
  p_landmark TEXT DEFAULT NULL,
  p_city TEXT DEFAULT 'Mumbai',
  p_state TEXT DEFAULT 'Maharashtra',
  p_postal_code TEXT DEFAULT '',
  p_country TEXT DEFAULT 'India',
  p_is_default BOOLEAN DEFAULT false,
  p_address_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN := public.is_admin();
  v_address RECORD;
  v_count INT;
  v_full_street TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save delivery address.';
  END IF;

  IF p_recipient_name IS NULL OR trim(p_recipient_name) = '' THEN
    RAISE EXCEPTION 'Recipient name is required.';
  END IF;

  IF p_street_address IS NULL OR trim(p_street_address) = '' THEN
    RAISE EXCEPTION 'Street address is required.';
  END IF;

  IF p_postal_code IS NULL OR trim(p_postal_code) = '' THEN
    RAISE EXCEPTION 'Postal code is required.';
  END IF;

  v_full_street := concat_ws(', ', 
    nullif(trim(p_house_number), ''), 
    nullif(trim(p_street_address), ''), 
    nullif(trim(p_locality), ''), 
    nullif(trim(p_landmark), '')
  );
  IF v_full_street = '' THEN
    v_full_street := p_street_address;
  END IF;

  SELECT count(*) INTO v_count FROM public.addresses WHERE user_id = v_user_id;
  IF v_count = 0 THEN
    p_is_default := true;
  END IF;

  IF p_is_default THEN
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = v_user_id AND is_default = true;
  END IF;

  IF p_address_id IS NOT NULL THEN
    IF NOT v_is_admin THEN
      SELECT 1 FROM public.addresses WHERE id = p_address_id AND user_id = v_user_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Forbidden: You cannot modify this address.';
      END IF;
    END IF;

    UPDATE public.addresses
    SET
      title = COALESCE(trim(p_title), 'Home'),
      recipient_name = trim(p_recipient_name),
      phone = trim(p_phone),
      house_number = nullif(trim(p_house_number), ''),
      street_address = v_full_street,
      locality = nullif(trim(p_locality), ''),
      landmark = nullif(trim(p_landmark), ''),
      city = trim(p_city),
      state = trim(p_state),
      postal_code = trim(p_postal_code),
      country = COALESCE(trim(p_country), 'India'),
      is_default = p_is_default
    WHERE id = p_address_id
    RETURNING * INTO v_address;
  ELSE
    INSERT INTO public.addresses (
      user_id, title, recipient_name, phone, house_number,
      street_address, locality, landmark, city, state, postal_code, country, is_default
    ) VALUES (
      v_user_id, COALESCE(trim(p_title), 'Home'), trim(p_recipient_name), trim(p_phone),
      nullif(trim(p_house_number), ''), v_full_street, nullif(trim(p_locality), ''),
      nullif(trim(p_landmark), ''), trim(p_city), trim(p_state), trim(p_postal_code),
      COALESCE(trim(p_country), 'India'), p_is_default
    ) RETURNING * INTO v_address;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Address saved successfully.', 'address', to_jsonb(v_address));
END;
$$;

REVOKE ALL ON FUNCTION public.save_customer_address(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_customer_address(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID) TO authenticated;

-- --------------------------------------------------------------------
-- 6. ATOMIC ORDER PLACEMENT (place_order)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order(
  p_items JSONB,
  p_delivery_address JSONB,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'Cash on Delivery (COD)',
  p_coupon_code TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC(10,2) := 0.00;
  v_discount NUMERIC(10,2) := 0.00;
  v_total NUMERIC(10,2) := 0.00;
  v_shipping NUMERIC(10,2) := 0.00;
  v_tax NUMERIC(10,2) := 0.00;
  v_item JSONB;
  v_product RECORD;
  v_variant RECORD;
  v_coupon RECORD;
  v_item_unit_price NUMERIC(10,2);
  v_item_total NUMERIC(10,2);
  v_prod_id UUID;
  v_qty INT;
  v_size TEXT;
  v_color TEXT;
  v_primary_image TEXT;
  v_tracking TEXT;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your bag is empty. Please select an item before checking out.';
  END IF;

  IF p_customer_name IS NULL OR trim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Recipient name is required.';
  END IF;

  IF p_customer_email IS NULL OR trim(p_customer_email) = '' THEN
    RAISE EXCEPTION 'A valid email address is required for order confirmation.';
  END IF;

  IF p_delivery_address IS NULL OR (p_delivery_address->>'address') IS NULL THEN
    RAISE EXCEPTION 'Complete delivery address is required.';
  END IF;

  v_order_number := 'NOIR-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
  v_tracking := 'BLUEDART-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));

  -- Pass 1: Lock products, read DB prices, verify stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_prod_id := (v_item->>'product_id')::uuid;
    ELSE
      SELECT id INTO v_prod_id FROM public.products WHERE slug = (v_item->>'product_id') LIMIT 1;
    END IF;

    IF v_prod_id IS NULL THEN
      RAISE EXCEPTION 'Garment % not found in catalog.', (v_item->>'product_id');
    END IF;

    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_size := v_item->>'size';
    v_color := v_item->>'color_name';

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity: %', v_qty;
    END IF;

    SELECT id, name, price, stock_quantity, is_published, is_archived
    INTO v_product
    FROM public.products
    WHERE id = v_prod_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Garment with ID % not found in catalog.', v_prod_id;
    END IF;

    IF NOT v_product.is_published OR v_product.is_archived THEN
      RAISE EXCEPTION '% is currently not available for purchase.', v_product.name;
    END IF;

    v_variant := NULL;
    IF v_size IS NOT NULL AND trim(v_size) <> '' THEN
      SELECT id, stock_quantity, price_modifier
      INTO v_variant
      FROM public.product_variants
      WHERE product_id = v_prod_id AND size = v_size
      FOR UPDATE;
    END IF;

    IF v_variant.id IS NOT NULL THEN
      IF v_variant.stock_quantity < v_qty THEN
        IF v_variant.stock_quantity = 0 THEN
          RAISE EXCEPTION 'Sorry, % is out of stock in size %.', v_product.name, v_size;
        ELSE
          RAISE EXCEPTION 'Only % left in size % for %.', v_variant.stock_quantity, v_size, v_product.name;
        END IF;
      END IF;
      v_item_unit_price := v_product.price + COALESCE(v_variant.price_modifier, 0.00);
    ELSE
      IF v_product.stock_quantity < v_qty THEN
        IF v_product.stock_quantity = 0 THEN
          RAISE EXCEPTION 'Sorry, % is currently out of stock.', v_product.name;
        ELSE
          RAISE EXCEPTION 'Only % left for %.', v_product.stock_quantity, v_product.name;
        END IF;
      END IF;
      v_item_unit_price := v_product.price;
    END IF;

    v_item_total := v_item_unit_price * v_qty;
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- Pass 2: Coupon validation
  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE upper(trim(code)) = upper(trim(p_coupon_code))
      AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Coupon code % is invalid or inactive.', p_coupon_code;
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'Coupon code % has expired.', p_coupon_code;
    END IF;

    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.times_used >= v_coupon.usage_limit THEN
      RAISE EXCEPTION 'Coupon code % has reached its usage limit.', p_coupon_code;
    END IF;

    IF v_coupon.min_order_amount > 0 AND v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Coupon % requires a minimum order of ₹%.', p_coupon_code, v_coupon.min_order_amount;
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_discount := round((v_subtotal * (v_coupon.discount_value / 100.0)), 2);
      IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
        v_discount := v_coupon.max_discount_amount;
      END IF;
    ELSE
      v_discount := LEAST(v_subtotal, v_coupon.discount_value);
    END IF;

    UPDATE public.coupons
    SET times_used = times_used + 1
    WHERE id = v_coupon.id;
  END IF;

  v_total := GREATEST(0.00, v_subtotal - v_discount);

  -- Insert Order
  INSERT INTO public.orders (
    order_number, user_id, customer_name, customer_email, customer_phone,
    shipping_address, status, payment_method, payment_status,
    subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
    coupon_code, tracking_number, courier_name, notes, created_at
  ) VALUES (
    v_order_number, v_user_id, trim(p_customer_name), lower(trim(p_customer_email)), p_customer_phone,
    p_delivery_address, 'pending', COALESCE(p_payment_method, 'Cash on Delivery (COD)'), 'pending',
    v_subtotal, v_discount, v_shipping, v_tax, v_total,
    CASE WHEN v_discount > 0 THEN upper(trim(p_coupon_code)) ELSE NULL END,
    v_tracking, 'Blue Dart Express India', p_notes, now()
  ) RETURNING id INTO v_order_id;

  -- Pass 3: Insert order items & decrement inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_prod_id := (v_item->>'product_id')::uuid;
    ELSE
      SELECT id INTO v_prod_id FROM public.products WHERE slug = (v_item->>'product_id') LIMIT 1;
    END IF;

    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_size := v_item->>'size';
    v_color := v_item->>'color_name';

    SELECT name, price INTO v_product FROM public.products WHERE id = v_prod_id;

    SELECT url INTO v_primary_image
    FROM public.product_images
    WHERE product_id = v_prod_id
    ORDER BY is_primary DESC, display_order ASC
    LIMIT 1;

    v_variant := NULL;
    IF v_size IS NOT NULL AND trim(v_size) <> '' THEN
      SELECT id, price_modifier
      INTO v_variant
      FROM public.product_variants
      WHERE product_id = v_prod_id AND size = v_size;
    END IF;

    v_item_unit_price := v_product.price + COALESCE(v_variant.price_modifier, 0.00);
    v_item_total := v_item_unit_price * v_qty;

    INSERT INTO public.order_items (
      order_id, product_id, product_name, product_image, variant_id,
      color_name, size, unit_price, quantity, total_price
    ) VALUES (
      v_order_id, v_prod_id, v_product.name, COALESCE(v_primary_image, v_item->>'product_image'),
      v_variant.id, v_color, v_size, v_item_unit_price, v_qty, v_item_total
    );

    UPDATE public.products
    SET stock_quantity = GREATEST(0, stock_quantity - v_qty),
        updated_at = now()
    WHERE id = v_prod_id;

    IF v_variant.id IS NOT NULL THEN
      UPDATE public.product_variants
      SET stock_quantity = GREATEST(0, stock_quantity - v_qty)
      WHERE id = v_variant.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'tracking_number', v_tracking,
    'subtotal', v_subtotal,
    'discount_amount', v_discount,
    'total_amount', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(JSONB, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(JSONB, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

-- --------------------------------------------------------------------
-- 7. IDEMPOTENT ORDER CANCELLATION (cancel_order)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := public.is_admin();
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found in records.';
  END IF;

  IF NOT v_is_admin THEN
    IF v_order.user_id IS NULL OR v_order.user_id <> v_caller THEN
      RAISE EXCEPTION 'Forbidden: You are not authorized to cancel this order.';
    END IF;
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Order is already cancelled.',
      'order', to_jsonb(v_order)
    );
  END IF;

  IF v_order.status IN ('shipped', 'delivered', 'out_for_delivery') AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Orders that are already shipped or delivered cannot be cancelled.';
  END IF;

  -- Restore Inventory
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    IF v_item.product_id IS NOT NULL AND v_item.quantity > 0 THEN
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id;

      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity + v_item.quantity
        WHERE id = v_item.variant_id;
      ELSIF v_item.size IS NOT NULL AND trim(v_item.size) <> '' THEN
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity + v_item.quantity
        WHERE product_id = v_item.product_id AND size = v_item.size;
      END IF;
    END IF;
  END LOOP;

  -- Restore coupon usage
  IF v_order.coupon_code IS NOT NULL AND trim(v_order.coupon_code) <> '' THEN
    UPDATE public.coupons
    SET times_used = GREATEST(0, times_used - 1)
    WHERE upper(trim(code)) = upper(trim(v_order.coupon_code));
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = COALESCE(trim(p_reason), 'Cancelled by patron'),
      updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order cancelled and stock restored successfully.',
    'order', to_jsonb(v_order)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) TO authenticated, anon;
