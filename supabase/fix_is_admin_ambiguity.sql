-- =====================================================================
-- HOTFIX: FIX_IS_ADMIN_AMBIGUITY.SQL
-- Resolves: ERROR 42725: function public.is_admin() is not unique
-- HINT: Could not choose a best candidate function.
-- =====================================================================

-- 1. Drop the overloaded function signature with default argument that caused the collision
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- 2. Define the unambiguous zero-argument is_admin() function
-- Used by all Row-Level Security (RLS) policies on orders, products, expenses, etc.
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

-- 3. Define the unambiguous one-argument is_admin(user_id uuid) WITHOUT a default parameter
-- Allows passing explicit user_id without making 0-argument calls ambiguous
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

-- 4. Grant execution permissions
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role, anon;

-- Verification query (will return true or false cleanly with 0 errors)
SELECT public.is_admin() AS is_admin_no_args, public.is_admin(auth.uid()) AS is_admin_with_args;

