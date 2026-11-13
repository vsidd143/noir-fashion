-- ====================================================================
-- NOIR LUXURY MIGRATION: 20261113_online_and_cod_revenue_sync.sql
-- Description: Standardize Online Payment (Razorpay) and Offline (COD) 
--              revenue tracking in public.orders. Auto-mark delivered orders 
--              as paid, and ensure atomic online order persistence.
-- ====================================================================

-- 1. Standardize default payment method and status constraints
ALTER TABLE public.orders 
  ALTER COLUMN payment_method SET DEFAULT 'Cash on Delivery (COD)';

-- 2. Clean and synchronize existing orders in database
-- Any delivered order has realized its revenue (cash collected or online pre-paid)
UPDATE public.orders
SET payment_status = 'paid', updated_at = now()
WHERE status = 'delivered' AND payment_status != 'paid';

-- Ensure all online orders (Razorpay, UPI, Cards, Netbanking) are marked as paid
UPDATE public.orders
SET payment_status = 'paid', updated_at = now()
WHERE (
  payment_method ILIKE '%razorpay%' 
  OR payment_method ILIKE '%online%' 
  OR payment_method ILIKE '%card%' 
  OR payment_method ILIKE '%upi%'
  OR payment_method ILIKE '%scanner%'
) AND status != 'cancelled' AND payment_status != 'paid';

-- Ensure null/blank payment methods default to COD
UPDATE public.orders
SET payment_method = 'Cash on Delivery (COD)', updated_at = now()
WHERE payment_method IS NULL OR trim(payment_method) = '';

-- 3. Automatic Trigger: Auto-set payment_status = 'paid' when status becomes 'delivered'
CREATE OR REPLACE FUNCTION public.fn_sync_delivered_order_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When order is delivered, cash has been received by courier or customer
  IF NEW.status = 'delivered' AND (NEW.payment_status IS NULL OR NEW.payment_status = 'pending') THEN
    NEW.payment_status := 'paid';
    NEW.updated_at := now();
  END IF;
  
  -- When order is cancelled, reflect cancellation in payment status if pending
  IF NEW.status = 'cancelled' AND NEW.payment_status = 'pending' THEN
    NEW.payment_status := 'cancelled';
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_delivered_order_payment ON public.orders;
CREATE TRIGGER trg_sync_delivered_order_payment
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_delivered_order_payment();

-- 4. Update atomic place_order function to handle online payment statuses properly
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
  v_tracking TEXT;
  v_is_online BOOLEAN;
  v_initial_status TEXT;
  v_initial_payment_status TEXT;
  v_item JSONB;
  v_product_id UUID;
  v_requested_qty INT;
  v_stock INT;
  v_price NUMERIC(10,2);
  v_item_subtotal NUMERIC(10,2);
BEGIN
  -- Validate payload
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shopping bag is empty');
  END IF;

  IF p_customer_name IS NULL OR length(trim(p_customer_name)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer name is required');
  END IF;

  IF p_customer_email IS NULL OR p_customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A valid email address is required');
  END IF;

  -- Detect payment method
  v_is_online := (
    p_payment_method ILIKE '%razorpay%' OR 
    p_payment_method ILIKE '%online%' OR 
    p_payment_method ILIKE '%card%' OR 
    p_payment_method ILIKE '%upi%' OR 
    p_payment_method ILIKE '%scanner%'
  );

  IF v_is_online THEN
    v_initial_status := 'confirmed';
    v_initial_payment_status := 'paid';
  ELSE
    v_initial_status := 'pending';
    v_initial_payment_status := 'pending';
  END IF;

  -- Generate order number and tracking
  v_order_number := 'NOIR-IN-' || floor(100000 + random() * 900000)::text;
  v_tracking := 'TRK-IN-' || floor(100000 + random() * 900000)::text;

  -- Loop through items to calculate subtotal and check stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_requested_qty := COALESCE((v_item->>'quantity')::INT, 1);

    SELECT stock_quantity, price INTO v_stock, v_price
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Product record not found: ' || v_product_id);
    END IF;

    IF v_stock < v_requested_qty THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock for product. Available: ' || v_stock);
    END IF;

    v_item_subtotal := v_price * v_requested_qty;
    v_subtotal := v_subtotal + v_item_subtotal;
  END LOOP;

  v_total := v_subtotal;

  -- Insert order
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
    v_initial_status,
    COALESCE(p_payment_method, 'Cash on Delivery (COD)'),
    v_initial_payment_status,
    v_subtotal,
    v_discount,
    v_shipping,
    v_tax,
    v_total,
    p_coupon_code,
    v_tracking,
    'Blue Dart Express India',
    p_notes,
    now()
  ) RETURNING id INTO v_order_id;

  -- Insert order items & deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_requested_qty := COALESCE((v_item->>'quantity')::INT, 1);
    v_price := (v_item->>'unit_price')::NUMERIC(10,2);

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      color_name,
      size,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      v_product_id,
      COALESCE(v_item->>'product_name', 'Luxury Piece'),
      v_item->>'product_image',
      COALESCE(v_item->>'color_name', 'Standard'),
      COALESCE(v_item->>'size', 'M'),
      v_requested_qty,
      v_price,
      v_price * v_requested_qty
    );

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_requested_qty,
        updated_at = now()
    WHERE id = v_product_id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total,
    'payment_method', p_payment_method,
    'payment_status', v_initial_payment_status,
    'status', v_initial_status
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

