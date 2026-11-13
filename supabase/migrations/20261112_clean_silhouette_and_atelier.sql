-- ====================================================================
-- DATABASE PURGE & SANITIZATION: REMOVE SILHOUETTE & ATELIER
-- Replaces "Silhouette" with "Fit" / "Product" and "Atelier" with "Studio"
-- across all products, categories, and specifications in Supabase
-- ====================================================================

-- 1. Update Product Fit specifications (e.g. "Oversized Boxy Silhouette" -> "Oversized Boxy Fit")
UPDATE products
SET fit = TRIM(REPLACE(REPLACE(fit, 'Silhouette', 'Fit'), 'silhouette', 'Fit'))
WHERE fit ILIKE '%silhouette%';

-- 2. Update Product Names
UPDATE products
SET name = REPLACE(REPLACE(name, 'Atelier', 'Studio'), 'atelier', 'Studio')
WHERE name ILIKE '%atelier%';

UPDATE products
SET name = REPLACE(REPLACE(name, 'Silhouette', 'Product'), 'silhouette', 'Product')
WHERE name ILIKE '%silhouette%';

-- 3. Update Product Subtitles
UPDATE products
SET subtitle = REPLACE(REPLACE(subtitle, 'Atelier', 'Studio'), 'atelier', 'Studio')
WHERE subtitle ILIKE '%atelier%';

UPDATE products
SET subtitle = REPLACE(REPLACE(subtitle, 'Silhouette', 'Product'), 'silhouette', 'Product')
WHERE subtitle ILIKE '%silhouette%';

-- 4. Update Product Descriptions
UPDATE products
SET description = REPLACE(REPLACE(description, 'Silhouette', 'Product'), 'silhouette', 'product')
WHERE description ILIKE '%silhouette%';

UPDATE products
SET description = REPLACE(REPLACE(description, 'Atelier', 'Studio'), 'atelier', 'studio')
WHERE description ILIKE '%atelier%';

-- 5. Update Product Material
UPDATE products
SET material = REPLACE(REPLACE(material, 'Silhouette', 'Product'), 'silhouette', 'product')
WHERE material ILIKE '%silhouette%';

-- 6. Ensure default product fit is 'Oversized Boxy Fit'
ALTER TABLE products
ALTER COLUMN fit SET DEFAULT 'Oversized Boxy Fit';

