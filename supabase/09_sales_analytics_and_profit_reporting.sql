-- =====================================================================
-- MIGRATION: 09_SALES_ANALYTICS_AND_PROFIT_REPORTING.SQL
-- NOIR Luxury Atelier - Enterprise Sales Analytics, Profit Engine,
-- Customer Loss Tracking, Operating Expenses & Audit System
-- =====================================================================

-- -------------------------------------------------------------
-- 0. RESOLVE IS_ADMIN AMBIGUITY (FIX ERROR 42725)
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

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

-- -------------------------------------------------------------
-- 1. EXTEND PRODUCTS AND ORDER ITEMS WITH COST OF GOODS (COGS)
-- -------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS weight_grams INT DEFAULT 500;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT NULL;

-- -------------------------------------------------------------
-- 2. EXTEND ORDERS TABLE FOR DEEPER CANCELLATION & AUDIT CONTEXT
-- -------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_status TEXT DEFAULT NULL;

-- -------------------------------------------------------------
-- 3. CREATE ORDER STATUS HISTORY TABLE (AUDIT TRAIL)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON public.order_status_history(created_at);

-- -------------------------------------------------------------
-- 4. CREATE ORDER CANCELLATIONS TABLE (CUSTOMER LOSS REASONING)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  cancellation_reason TEXT NOT NULL,
  additional_explanation TEXT,
  previous_status TEXT,
  new_status TEXT DEFAULT 'cancelled' NOT NULL,
  cancelled_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_cancellations_order_id ON public.order_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_customer_id ON public.order_cancellations(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_reason ON public.order_cancellations(cancellation_reason);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_cancelled_at ON public.order_cancellations(cancelled_at);

-- -------------------------------------------------------------
-- 5. CREATE OPERATING EXPENSES TABLE (ACCURATE PROFIT REPORTING)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operating_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('shipping', 'packaging', 'payment_gateway', 'marketing', 'operations', 'salaries', 'other')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operating_expenses_date ON public.operating_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_operating_expenses_category ON public.operating_expenses(category);

-- -------------------------------------------------------------
-- 6. PERFORMANCE INDEXES FOR REAL-TIME ANALYTICS & DATE BOUNDARIES
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_created_at_status ON public.orders(created_at, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(updated_at) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- -------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;

-- Order Status History RLS
DROP POLICY IF EXISTS "Admins have full access to order_status_history" ON public.order_status_history;
CREATE POLICY "Admins have full access to order_status_history"
  ON public.order_status_history FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view their own order status history" ON public.order_status_history;
CREATE POLICY "Users can view their own order status history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- Order Cancellations RLS
DROP POLICY IF EXISTS "Admins have full access to order_cancellations" ON public.order_cancellations;
CREATE POLICY "Admins have full access to order_cancellations"
  ON public.order_cancellations FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Customers can record cancellation for own orders" ON public.order_cancellations;
CREATE POLICY "Customers can record cancellation for own orders"
  ON public.order_cancellations FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can view their own cancellations" ON public.order_cancellations;
CREATE POLICY "Customers can view their own cancellations"
  ON public.order_cancellations FOR SELECT
  USING (
    customer_id = auth.uid()
    OR public.is_admin()
  );

-- Operating Expenses RLS (Strictly Admin-Only)
DROP POLICY IF EXISTS "Admins have full access to operating_expenses" ON public.operating_expenses;
CREATE POLICY "Admins have full access to operating_expenses"
  ON public.operating_expenses FOR ALL
  USING (public.is_admin());

-- -------------------------------------------------------------
-- 8. SECURE RPC: RECORD ORDER CANCELLATION WITH AUDIT
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_order_cancellation(
  p_order_id UUID,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_prev_status TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Check admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  -- Fetch order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Authorize caller
  IF v_order.user_id IS NOT NULL AND v_order.user_id <> v_caller AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized to cancel this order';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN to_jsonb(v_order);
  END IF;

  IF v_order.status IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'Order is already in transit or delivered and cannot be cancelled';
  END IF;

  v_prev_status := v_order.status;

  -- 1. Update order
  UPDATE public.orders
  SET
    status = 'cancelled',
    previous_status = v_prev_status,
    cancelled_at = v_now,
    cancellation_reason = COALESCE(TRIM(p_reason), 'Customer requested cancellation'),
    cancellation_notes = p_notes,
    updated_at = v_now
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- 2. Insert cancellation log
  INSERT INTO public.order_cancellations (
    order_id,
    customer_id,
    customer_email,
    cancellation_reason,
    additional_explanation,
    previous_status,
    new_status,
    cancelled_at
  ) VALUES (
    p_order_id,
    v_order.user_id,
    v_order.customer_email,
    COALESCE(TRIM(p_reason), 'Customer requested cancellation'),
    p_notes,
    v_prev_status,
    'cancelled',
    v_now
  );

  -- 3. Insert status history audit
  INSERT INTO public.order_status_history (
    order_id,
    previous_status,
    new_status,
    changed_by,
    notes,
    created_at
  ) VALUES (
    p_order_id,
    v_prev_status,
    'cancelled',
    v_caller,
    COALESCE(TRIM(p_reason), 'Cancelled by client') || CASE WHEN p_notes IS NOT NULL THEN ' | Note: ' || p_notes ELSE '' END,
    v_now
  );

  RETURN to_jsonb(v_order);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_order_cancellation(UUID, TEXT, TEXT) TO authenticated, anon;

-- -------------------------------------------------------------
-- 9. SECURE RPC: TRANSITION ORDER STATUS WITH HISTORY
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_prev_status TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Admin check
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin authorization required to change order status';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  v_prev_status := v_order.status;

  -- Update order
  UPDATE public.orders
  SET
    status = p_new_status::public.order_status,
    previous_status = v_prev_status,
    updated_at = v_now
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Record status history
  INSERT INTO public.order_status_history (
    order_id,
    previous_status,
    new_status,
    changed_by,
    notes,
    created_at
  ) VALUES (
    p_order_id,
    v_prev_status,
    p_new_status,
    v_caller,
    p_notes,
    v_now
  );

  RETURN to_jsonb(v_order);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT, TEXT) TO authenticated;

-- -------------------------------------------------------------
-- 10. REALTIME PUBLICATION SETUP
-- -------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.operating_expenses;
    EXCEPTION WHEN duplicate_object THEN
      -- table already in publication
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
    EXCEPTION WHEN duplicate_object THEN
      -- table already in publication
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.order_cancellations;
    EXCEPTION WHEN duplicate_object THEN
      -- table already in publication
    END;
  END IF;
END $$;

