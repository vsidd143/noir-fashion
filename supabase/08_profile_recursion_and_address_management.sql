-- ====================================================================
-- NOIR LUXURY ATELIER — MIGRATION 08
-- FIX PROFILES INFINITE RECURSION, ROBUST ADDRESS & DEFAULT MANAGEMENT,
-- INVENTORY ATOMICITY, AND COMPLETE REAL-TIME SYNCHRONIZATION
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. SECURE NON-RECURSIVE ADMIN VERIFICATION FUNCTION
-- --------------------------------------------------------------------
-- Root Cause of Infinite Recursion:
-- Policies on public.profiles previously queried public.profiles using
-- inline subqueries (EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin')).
-- When PostgreSQL evaluated the policy on profiles, it executed a query
-- on profiles, which triggered the policy evaluation again in an endless loop.
--
-- The Solution:
-- A SECURITY DEFINER function with explicit search_path that runs with table
-- owner privileges, bypassing RLS on public.profiles and returning a boolean.
-- --------------------------------------------------------------------

-- Drop overloaded function with default argument that caused ambiguity (ERROR 42725)
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- 1a. Zero-argument version (invoked by public.is_admin() across all RLS policies)
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

-- 1b. One-argument version WITHOUT default argument (eliminating ambiguity for 0-argument calls)
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

-- Restrict execution to authenticated users, service role, and anon
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role, anon;

-- --------------------------------------------------------------------
-- 2. FIX ROW LEVEL SECURITY ON PUBLIC.PROFILES (ZERO RECURSION)
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all legacy and recursive policies
DROP POLICY IF EXISTS "Public profiles are readable" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile and admins can update all" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full control over profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service or authenticated insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Ensure required columns exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;

-- 2a. SELECT: Customers read their own profile; Admins read all profiles
CREATE POLICY "Profiles select policy" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

-- 2b. UPDATE: Customers update only their own profile; Admins can update any profile.
-- Customers cannot change their own user ID.
CREATE POLICY "Profiles update policy" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    (auth.uid() = id AND id = auth.uid()) OR public.is_admin(auth.uid())
  );

-- 2c. INSERT: Users can insert their own profile, or service_role / triggers
CREATE POLICY "Profiles insert policy" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id OR public.is_admin(auth.uid()) OR auth.role() = 'service_role'
  );

-- 2d. DELETE: Strictly administrators can delete profiles
CREATE POLICY "Profiles delete policy" ON public.profiles
  FOR DELETE
  USING (
    public.is_admin(auth.uid())
  );

-- --------------------------------------------------------------------
-- 3. SAVED ADDRESSES TABLE ENHANCEMENTS & DEFAULT ADDRESS TRIGGER
-- --------------------------------------------------------------------
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Ensure all address columns exist
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.addresses ALTER COLUMN country SET DEFAULT 'India';

-- Drop legacy address policies
DROP POLICY IF EXISTS "Users manage their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Addresses select policy" ON public.addresses;
DROP POLICY IF EXISTS "Addresses insert policy" ON public.addresses;
DROP POLICY IF EXISTS "Addresses update policy" ON public.addresses;
DROP POLICY IF EXISTS "Addresses delete policy" ON public.addresses;

-- RLS: Customers manage strictly their own addresses; Admins can view/manage
CREATE POLICY "Addresses select policy" ON public.addresses
  FOR SELECT
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

CREATE POLICY "Addresses insert policy" ON public.addresses
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

CREATE POLICY "Addresses update policy" ON public.addresses
  FOR UPDATE
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

CREATE POLICY "Addresses delete policy" ON public.addresses
  FOR DELETE
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

-- Trigger Function: Enforce Single Default Address & Automatic Promotion
CREATE OR REPLACE FUNCTION public.handle_address_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  -- INSERT: If first address for user, automatically set is_default = true
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO v_count FROM public.addresses WHERE user_id = NEW.user_id;
    IF v_count = 0 THEN
      NEW.is_default := true;
    ELSIF NEW.is_default = true THEN
      -- Unset previous defaults for this user
      UPDATE public.addresses
      SET is_default = false
      WHERE user_id = NEW.user_id AND is_default = true;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: If address is set to default, unset other addresses
  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_default = true AND (OLD.is_default = false OR OLD.is_default IS NULL) THEN
      UPDATE public.addresses
      SET is_default = false
      WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
    END IF;
    RETURN NEW;
  END IF;

  -- DELETE: If deleted address was default, promote another saved address if available
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_default = true THEN
      UPDATE public.addresses
      SET is_default = true
      WHERE id = (
        SELECT id FROM public.addresses
        WHERE user_id = OLD.user_id AND id != OLD.id
        ORDER BY created_at DESC
        LIMIT 1
      );
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_address_default_insert ON public.addresses;
CREATE TRIGGER trg_handle_address_default_insert
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_address_default();

DROP TRIGGER IF EXISTS trg_handle_address_default_delete ON public.addresses;
CREATE TRIGGER trg_handle_address_default_delete
  AFTER DELETE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_address_default();

-- --------------------------------------------------------------------
-- 4. ATOMIC INVENTORY & STOCK MANAGEMENT FUNCTIONS
-- --------------------------------------------------------------------
-- Atomically decrement stock when an order is created
CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  p_product_id TEXT,
  p_qty INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(0, stock_quantity - p_qty),
      updated_at = now()
  WHERE id::text = p_product_id OR slug = p_product_id;
END;
$$;

-- Atomically increment stock when an order is cancelled
CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_product_id TEXT,
  p_qty INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity + p_qty,
      updated_at = now()
  WHERE id::text = p_product_id OR slug = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_product_stock(TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(TEXT, INT) TO authenticated, service_role;

-- --------------------------------------------------------------------
-- 5. REALTIME PUBLICATION CONFIGURATION
-- --------------------------------------------------------------------
DO $$
BEGIN
  -- Ensure tables are published to supabase_realtime
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.addresses';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.products';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

