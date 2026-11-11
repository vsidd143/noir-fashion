-- ====================================================================
-- NOIR LUXURY MIGRATION: 20261110_04_atomic_order_placement_and_cancellation.sql
-- Description: Atomic order placement (place_order) and idempotent order cancellation (cancel_order).
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ATOMIC ORDER PLACEMENT (place_order)
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
  -- 1. Validate Input Payload
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

  -- 2. Generate Unique Order Number and Tracking
  v_order_number := 'NOIR-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
  v_tracking := 'BLUEDART-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));

  -- 3. Pass 1: Lock Products & Variants, Enforce Live DB Prices, Verify Stock
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

    -- Lock Product Row for Update
    SELECT id, name, price, stock_quantity, is_published, is_archived
    INTO v_product
    FROM public.products
    WHERE id = v_prod_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Garment silhouette with ID % not found in catalog.', v_prod_id;
    END IF;

    IF NOT v_product.is_published OR v_product.is_archived THEN
      RAISE EXCEPTION '% is currently not available for purchase.', v_product.name;
    END IF;

    -- Check Variant Stock if size specified
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
      -- Fallback to product-level stock check
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

  -- 4. Pass 2: Atomic Coupon Validation from Supabase Coupons Table
  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE upper(trim(code)) = upper(trim(p_coupon_code))
      AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Coupon code % is invalid or expired.', p_coupon_code;
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

    -- Increment coupon usage
    UPDATE public.coupons
    SET times_used = times_used + 1
    WHERE id = v_coupon.id;
  END IF;

  -- 5. Calculate Final Order Amount
  v_total := GREATEST(0.00, v_subtotal - v_discount);

  -- 6. Insert Order Record
  INSERT INTO public.orders (
    order_number,
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    status,
    payment_method,
    payment_status,
    subtotal,
    discount_amount,
    shipping_fee,
    tax_amount,
    total_amount,
    coupon_code,
    tracking_number,
    courier_name,
    notes,
    created_at
  ) VALUES (
    v_order_number,
    v_user_id,
    trim(p_customer_name),
    lower(trim(p_customer_email)),
    p_customer_phone,
    p_delivery_address,
    'pending',
    COALESCE(p_payment_method, 'Cash on Delivery (COD)'),
    'pending',
    v_subtotal,
    v_discount,
    v_shipping,
    v_tax,
    v_total,
    CASE WHEN v_discount > 0 THEN upper(trim(p_coupon_code)) ELSE NULL END,
    v_tracking,
    'Blue Dart Express India',
    p_notes,
    now()
  ) RETURNING id INTO v_order_id;

  -- 7. Pass 3: Insert Order Items and Decrement Inventory
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

    -- Fetch primary image
    SELECT url INTO v_primary_image
    FROM public.product_images
    WHERE product_id = v_prod_id
    ORDER BY is_primary DESC, display_order ASC
    LIMIT 1;

    -- Check variant
    v_variant := NULL;
    IF v_size IS NOT NULL AND trim(v_size) <> '' THEN
      SELECT id, price_modifier
      INTO v_variant
      FROM public.product_variants
      WHERE product_id = v_prod_id AND size = v_size;
    END IF;

    v_item_unit_price := v_product.price + COALESCE(v_variant.price_modifier, 0.00);
    v_item_total := v_item_unit_price * v_qty;

    -- Insert snapshot item with product_id UUID
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      variant_id,
      color_name,
      size,
      unit_price,
      quantity,
      total_price
    ) VALUES (
      v_order_id,
      v_prod_id,
      v_product.name,
      COALESCE(v_primary_image, v_item->>'product_image'),
      v_variant.id,
      v_color,
      v_size,
      v_item_unit_price,
      v_qty,
      v_item_total
    );

    -- Decrement Product Stock
    UPDATE public.products
    SET stock_quantity = GREATEST(0, stock_quantity - v_qty),
        updated_at = now()
    WHERE id = v_prod_id;

    -- Decrement Variant Stock if variant present
    IF v_variant.id IS NOT NULL THEN
      UPDATE public.product_variants
      SET stock_quantity = GREATEST(0, stock_quantity - v_qty)
      WHERE id = v_variant.id;
    END IF;
  END LOOP;

  -- 8. Return Confirmation Payload
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
-- 2. SECURE & IDEMPOTENT ORDER CANCELLATION (cancel_order)
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
  -- 1. Fetch Order with Exclusive Row Lock
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found in records.';
  END IF;

  -- 2. Authorization Check (Owner or Admin)
  IF NOT v_is_admin THEN
    IF v_order.user_id IS NULL OR v_order.user_id <> v_caller THEN
      RAISE EXCEPTION 'Forbidden: You are not authorized to cancel this order.';
    END IF;
  END IF;

  -- 3. Idempotency Check: Cannot cancel or restore stock twice
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Order is already cancelled.',
      'order', to_jsonb(v_order)
    );
  END IF;

  -- 4. Lifecycle Validation: Cannot cancel if already shipped or delivered
  IF v_order.status IN ('shipped', 'delivered', 'out_for_delivery') AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Orders that are already shipped or delivered cannot be cancelled.';
  END IF;

  -- 5. Restore Inventory for each item in the order
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    IF v_item.product_id IS NOT NULL AND v_item.quantity > 0 THEN
      -- Restore main product stock
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id;

      -- Restore variant stock if recorded
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

  -- 6. Restore Coupon usage count if coupon was used
  IF v_order.coupon_code IS NOT NULL AND trim(v_order.coupon_code) <> '' THEN
    UPDATE public.coupons
    SET times_used = GREATEST(0, times_used - 1)
    WHERE upper(trim(code)) = upper(trim(v_order.coupon_code));
  END IF;

  -- 7. Update Order Status
  UPDATE public.orders
  SET status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = COALESCE(trim(p_reason), 'Cancelled by patron'),
      updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- 8. Return Success Confirmation
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order cancelled and stock restored successfully.',
    'order', to_jsonb(v_order)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) TO authenticated, anon;

