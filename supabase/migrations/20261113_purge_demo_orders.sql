-- ====================================================================
-- PURGE DEMO & ARCHIVE ORDERS FROM SUPABASE
-- Permanently deletes orders and order items referencing demo products
-- (Phantom Hoodie, Solstice Bomber, Monolith Tee, Atelier Cargo, etc.)
-- ====================================================================

-- 1. Identify and delete demo order items
DELETE FROM order_items
WHERE product_name ILIKE '%phantom%'
   OR product_name ILIKE '%solstice%'
   OR product_name ILIKE '%monolith%'
   OR product_name ILIKE '%shadow runner%'
   OR product_name ILIKE '%atelier%'
   OR product_name ILIKE '%exoskeleton%';

-- 2. Delete any orders that used demo DHL-EXP waybills or Atelier courier
DELETE FROM orders
WHERE courier_name ILIKE '%atelier%'
   OR tracking_number ILIKE '%DHL-EXP%';

-- 3. Delete any orphaned orders left with 0 order items
DELETE FROM orders
WHERE id NOT IN (SELECT DISTINCT order_id FROM order_items WHERE order_id IS NOT NULL);

