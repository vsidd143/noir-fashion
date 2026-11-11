-- ====================================================================
-- NOIR LUXURY MIGRATION: 20261110_02_prevent_profile_role_escalation.sql
-- Description: Unambiguous is_admin() helper and anti-privilege escalation trigger.
-- ====================================================================

-- 1. Ensure unambiguous is_admin() helper
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

-- 2. Trigger function to prevent non-admins from changing their role or blocked status
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Check if role or is_blocked is being modified
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_blocked IS DISTINCT FROM OLD.is_blocked) THEN
    -- Only existing active administrators are permitted to alter roles or block status
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

-- 3. Update Profiles RLS policies to enforce strict ownership
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles insert policy" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id OR public.is_admin() OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;
CREATE POLICY "Profiles delete policy" ON public.profiles
  FOR DELETE
  USING (
    public.is_admin()
  );

