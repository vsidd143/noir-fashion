-- =====================================================================
-- MIGRATION: 07_ORDER_CONFIRMATION_AND_CANCELLATION.SQL
-- Customer Order Confirmation & Cancellation System with Real-Time Support
-- =====================================================================

-- 1. Add confirmation and cancellation audit fields to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Create index on status and user_id for faster real-time lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- 3. Enable Row Level Security (RLS) policies for customer order updates
-- Allow customers to update their own order status for confirmation/cancellation
DROP POLICY IF EXISTS "Customers can update their own orders" ON public.orders;
CREATE POLICY "Customers can update their own orders"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR public.is_admin()
  );

-- 4. Secure RPC function: confirm_customer_order
-- Validates ownership, checks order is in 'pending' status, sets confirmed status and timestamp
CREATE OR REPLACE FUNCTION public.confirm_customer_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order RECORD;
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  -- Fetch the order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate ownership
  IF v_order.user_id IS NOT NULL AND v_order.user_id <> v_caller AND NOT v_is_admin THEN
    RAISE EXCEPTION 'You are not authorized to confirm this order';
  END IF;

  -- Validate lifecycle state: only pending orders can be confirmed
  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot confirm an already cancelled order';
  END IF;

  IF v_order.status = 'confirmed' THEN
    -- Already confirmed, return gracefully
    RETURN to_jsonb(v_order);
  END IF;

  IF v_order.status IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'Order is already in fulfillment';
  END IF;

  -- Perform the confirmation update
  UPDATE public.orders
  SET 
    status = 'confirmed',
    customer_confirmed_at = COALESCE(customer_confirmed_at, now()),
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN to_jsonb(v_order);
END;
$$;

-- 5. Secure RPC function: cancel_customer_order
-- Validates ownership, ensures order is cancellable (not shipped/delivered/cancelled),
-- sets cancelled status, reason, and cancellation timestamp
CREATE OR REPLACE FUNCTION public.cancel_customer_order(p_order_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order RECORD;
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  -- Fetch the order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate ownership
  IF v_order.user_id IS NOT NULL AND v_order.user_id <> v_caller AND NOT v_is_admin THEN
    RAISE EXCEPTION 'You are not authorized to cancel this order';
  END IF;

  -- Already cancelled check
  IF v_order.status = 'cancelled' THEN
    RETURN to_jsonb(v_order);
  END IF;

  -- Validate lifecycle state: Shipped, out for delivery, and delivered orders cannot be cancelled
  IF v_order.status IN ('shipped', 'out_for_delivery', 'delivered') THEN
    RAISE EXCEPTION 'Orders that are already shipped or delivered cannot be cancelled';
  END IF;

  -- Perform the cancellation update
  UPDATE public.orders
  SET 
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = COALESCE(TRIM(p_reason), 'Cancelled by client'),
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN to_jsonb(v_order);
END;
$$;

-- Grant execution permissions on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION public.confirm_customer_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_customer_order(UUID, TEXT) TO authenticated;

-- 6. Enable Realtime Replication on public.orders for instant admin & customer synchronization
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;

