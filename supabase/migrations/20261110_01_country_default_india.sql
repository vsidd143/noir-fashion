-- ====================================================================
-- NOIR LUXURY MIGRATION: 20261110_01_country_default_india.sql
-- Description: Sets default country on addresses to 'India' and migrates legacy rows.
-- ====================================================================

ALTER TABLE public.addresses 
  ALTER COLUMN country SET DEFAULT 'India';

-- Update any legacy addresses that defaulted to 'France'
UPDATE public.addresses 
SET country = 'India' 
WHERE country = 'France';

