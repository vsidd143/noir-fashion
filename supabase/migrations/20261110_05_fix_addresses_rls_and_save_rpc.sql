-- ====================================================================
-- NOIR LUXURY MIGRATION: 20261110_05_fix_addresses_rls_and_save_rpc.sql
-- Description: Restores missing addresses RLS policies after function cascade drop
--              and provides an atomic save_customer_address RPC function.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. RESTORE EXPLICIT ROW LEVEL SECURITY POLICIES ON PUBLIC.ADDRESSES
-- --------------------------------------------------------------------
-- Ensure all columns exist on addresses table before creating functions or policies
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.addresses ALTER COLUMN country SET DEFAULT 'India';

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Drop any lingering or cascaded legacy policies
DROP POLICY IF EXISTS "Users manage their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Addresses select policy" ON public.addresses;
DROP POLICY IF EXISTS "Addresses insert policy" ON public.addresses;
DROP POLICY IF EXISTS "Addresses update policy" ON public.addresses;
DROP POLICY IF EXISTS "Addresses delete policy" ON public.addresses;

-- SELECT: Customers can read only their own saved addresses; Admins can read all
CREATE POLICY "Addresses select policy" ON public.addresses
  FOR SELECT
  USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- INSERT: Customers can insert addresses matching their own user_id; Admins can insert
CREATE POLICY "Addresses insert policy" ON public.addresses
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin()
  );

-- UPDATE: Customers can update only their own addresses; Admins can update any
CREATE POLICY "Addresses update policy" ON public.addresses
  FOR UPDATE
  USING (
    auth.uid() = user_id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin()
  );

-- DELETE: Customers can delete only their own addresses; Admins can delete any
CREATE POLICY "Addresses delete policy" ON public.addresses
  FOR DELETE
  USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- --------------------------------------------------------------------
-- 2. SECURE ATOMIC RPC FUNCTION: save_customer_address
-- --------------------------------------------------------------------
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

  -- Build full street line
  v_full_street := concat_ws(', ', 
    nullif(trim(p_house_number), ''), 
    nullif(trim(p_street_address), ''), 
    nullif(trim(p_locality), ''), 
    nullif(trim(p_landmark), '')
  );
  IF v_full_street = '' THEN
    v_full_street := p_street_address;
  END IF;

  -- If user has 0 addresses, first address is automatically default
  SELECT count(*) INTO v_count FROM public.addresses WHERE user_id = v_user_id;
  IF v_count = 0 THEN
    p_is_default := true;
  END IF;

  -- If marked as default, unset previous defaults
  IF p_is_default THEN
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = v_user_id AND is_default = true;
  END IF;

  IF p_address_id IS NOT NULL THEN
    -- Verify ownership for update
    IF NOT v_is_admin THEN
      SELECT 1 FROM public.addresses 
      WHERE id = p_address_id AND user_id = v_user_id;
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
      user_id,
      title,
      recipient_name,
      phone,
      house_number,
      street_address,
      locality,
      landmark,
      city,
      state,
      postal_code,
      country,
      is_default
    ) VALUES (
      v_user_id,
      COALESCE(trim(p_title), 'Home'),
      trim(p_recipient_name),
      trim(p_phone),
      nullif(trim(p_house_number), ''),
      v_full_street,
      nullif(trim(p_locality), ''),
      nullif(trim(p_landmark), ''),
      trim(p_city),
      trim(p_state),
      trim(p_postal_code),
      COALESCE(trim(p_country), 'India'),
      p_is_default
    ) RETURNING * INTO v_address;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Address saved successfully.',
    'address', to_jsonb(v_address)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_customer_address(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_customer_address(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID) TO authenticated;

