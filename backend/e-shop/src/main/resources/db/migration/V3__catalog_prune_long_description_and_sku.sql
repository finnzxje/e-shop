
-- V3__catalog_prune_long_description_and_sku.sql
-- Dialect: PostgreSQL
-- Purpose:
--   - Ensure products.description is kept (backfill if null/empty)
--   - Drop products.long_description
--   - Drop products.sku (and its UNIQUE constraint/index)
-- Notes:
--   - Safe to re-run (IF EXISTS guards)
--   - No changes required to views/triggers in V2

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'long_description'
  ) THEN
    -- Only fill when description is NULL or empty, and long_description is not NULL.
    UPDATE products
    SET description = long_description
    WHERE (description IS NULL OR btrim(description) = '')
      AND long_description IS NOT NULL;
  END IF;
END$$;

-- 2) Drop UNIQUE constraint on products.sku (created by "sku ... UNIQUE" in V2).
--    When a column-level UNIQUE was used, PostgreSQL names it "<table>_<column>_key".
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_sku_key;

-- 3) Drop columns
ALTER TABLE products
  DROP COLUMN IF EXISTS sku,
  DROP COLUMN IF EXISTS long_description;

COMMIT;
