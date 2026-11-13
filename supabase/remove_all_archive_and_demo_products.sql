-- ==============================================================================
-- NOIR STUDIO // PURGE ALL ARCHIVED AND DEMO PRODUCTS
-- Run this script in the Supabase SQL Editor to permanently remove:
-- 1. All products marked as is_archived = true
-- 2. All legacy demo/seed products that are not part of your active store
-- ==============================================================================

DO $$
DECLARE
  v_archived_count INT;
  v_demo_count INT;
BEGIN
  -- 1. Count items before purging
  SELECT COUNT(*) INTO v_archived_count FROM public.products WHERE is_archived = true;
  SELECT COUNT(*) INTO v_demo_count FROM public.products WHERE slug IN (
    'noir-phantom-hoodie',
    'noir-shadow-sneaker',
    'noir-exoskeleton-jacket',
    'noir-atelier-cargo-pant',
    'noir-monolith-heavy-tee',
    'noir-solstice-leather-bomber',
    'noir-cipher-vest',
    'noir-cyber-mask'
  );

  RAISE NOTICE 'Found % archived product(s) and % demo product(s) to purge.', v_archived_count, v_demo_count;

  -- 2. Safely unlink historical order_items so customer orders are preserved
  UPDATE public.order_items
  SET product_id = null
  WHERE product_id IN (
    SELECT id FROM public.products 
    WHERE is_archived = true 
       OR slug IN (
         'noir-phantom-hoodie',
         'noir-shadow-sneaker',
         'noir-exoskeleton-jacket',
         'noir-atelier-cargo-pant',
         'noir-monolith-heavy-tee',
         'noir-solstice-leather-bomber',
         'noir-cipher-vest',
         'noir-cyber-mask'
       )
  );

  -- 3. Delete dependent product variants
  DELETE FROM public.product_variants
  WHERE product_id IN (
    SELECT id FROM public.products 
    WHERE is_archived = true 
       OR slug IN (
         'noir-phantom-hoodie',
         'noir-shadow-sneaker',
         'noir-exoskeleton-jacket',
         'noir-atelier-cargo-pant',
         'noir-monolith-heavy-tee',
         'noir-solstice-leather-bomber',
         'noir-cipher-vest',
         'noir-cyber-mask'
       )
  );

  -- 4. Delete dependent product images
  DELETE FROM public.product_images
  WHERE product_id IN (
    SELECT id FROM public.products 
    WHERE is_archived = true 
       OR slug IN (
         'noir-phantom-hoodie',
         'noir-shadow-sneaker',
         'noir-exoskeleton-jacket',
         'noir-atelier-cargo-pant',
         'noir-monolith-heavy-tee',
         'noir-solstice-leather-bomber',
         'noir-cipher-vest',
         'noir-cyber-mask'
       )
  );

  -- 5. Delete dependent hotspots if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_hotspots') THEN
    DELETE FROM public.product_hotspots
    WHERE product_id IN (
      SELECT id FROM public.products 
      WHERE is_archived = true 
         OR slug IN (
           'noir-phantom-hoodie',
           'noir-shadow-sneaker',
           'noir-exoskeleton-jacket',
           'noir-atelier-cargo-pant',
           'noir-monolith-heavy-tee',
           'noir-solstice-leather-bomber',
           'noir-cipher-vest',
           'noir-cyber-mask'
         )
    );
  END IF;

  -- 6. Permanently delete the products
  DELETE FROM public.products
  WHERE is_archived = true 
     OR slug IN (
       'noir-phantom-hoodie',
       'noir-shadow-sneaker',
       'noir-exoskeleton-jacket',
       'noir-atelier-cargo-pant',
       'noir-monolith-heavy-tee',
       'noir-solstice-leather-bomber',
       'noir-cipher-vest',
       'noir-cyber-mask'
     );

  RAISE NOTICE 'Successfully purged all archived and demo products. Catalogue is completely clean!';
END $$;

