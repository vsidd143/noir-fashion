-- ====================================================================
-- NOIR ATELIER — MIGRATION 10: NEWSLETTER SUBSCRIBERS TABLE & RLS
-- ====================================================================

-- 1. Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'footer',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email 
  ON public.newsletter_subscribers (email);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public subscription (anon and authenticated can insert their email)
DROP POLICY IF EXISTS "Allow public newsletter subscription" ON public.newsletter_subscribers;
CREATE POLICY "Allow public newsletter subscription"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. Policy: Only authorized administrators can view subscriber emails
DROP POLICY IF EXISTS "Allow admins to view newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Allow admins to view newsletter subscribers"
  ON public.newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 5. Policy: Only authorized administrators can update or delete subscribers
DROP POLICY IF EXISTS "Allow admins to manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Allow admins to manage newsletter subscribers"
  ON public.newsletter_subscribers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Grant appropriate privileges to roles
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;

