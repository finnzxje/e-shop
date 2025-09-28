
-- V2__catalog_core.sql
-- Dialect: PostgreSQL
-- Scope:
--   - categories 
--   - colors
--   - product attributes/values
--   - products
--   - tags
--   - variants (+ attribute values)
--   - images (primary image uniqueness)
--   - external product refs
--   - updated_at trigger

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
    CREATE TYPE gender AS ENUM ('mens','womens','unisex','kids','unknown');
  END IF;
END$$;

BEGIN;

-- =============================================================================
-- 0) CATEGORIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id                 SERIAL PRIMARY KEY,
  name               VARCHAR(255) NOT NULL,
  slug               VARCHAR(255) NOT NULL UNIQUE,
  parent_category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
  display_order      INT NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_categories_parent_name'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT uq_categories_parent_name
      UNIQUE (parent_category_id, name);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- =============================================================================
-- 1) COLORS
-- =============================================================================
CREATE TABLE IF NOT EXISTS colors (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(64) NOT NULL UNIQUE,
  name       VARCHAR(128) NOT NULL,
  swatch_url VARCHAR(1024),
  hex        VARCHAR(7),
  CONSTRAINT colors_hex_format_chk CHECK (hex IS NULL OR hex ~ '^#[0-9A-Fa-f]{6}$')
);

-- =============================================================================
-- 2) PRODUCT ATTRIBUTES & VALUES
-- =============================================================================
CREATE TABLE IF NOT EXISTS product_attributes (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(128) NOT NULL UNIQUE,
  type  VARCHAR(64)  NOT NULL
);

CREATE TABLE IF NOT EXISTS product_attribute_values (
  id            SERIAL PRIMARY KEY,
  attribute_id  INT NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  value         VARCHAR(256) NOT NULL,
  display_value VARCHAR(256),
  CONSTRAINT uq_attr_value UNIQUE (attribute_id, value)
);

-- =============================================================================
-- 3) PRODUCTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(255),
  sku              VARCHAR(128) UNIQUE,
  description      TEXT,
  long_description TEXT,
  category_id      INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  base_price       NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (base_price >= 0),
  status           VARCHAR(32) NOT NULL DEFAULT 'draft',
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  gender           gender,
  taxonomy_path    TEXT[],
  product_type     VARCHAR(128),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_status_chk CHECK (status IN ('draft','active','archived'))
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status   ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_gender   ON products(gender);
CREATE INDEX IF NOT EXISTS idx_products_slug     ON products(slug);

-- =============================================================================
-- 4) PRODUCT TAGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS product_tags (
  id  SERIAL PRIMARY KEY,
  tag VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS product_tag_assignments (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     INT  NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- =============================================================================
-- 5) VARIANTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_variants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_sku        VARCHAR(128) UNIQUE,
  price              NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  quantity_in_stock  INT NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  size               VARCHAR(64),
  fit                VARCHAR(64),
  color_id           INT REFERENCES colors(id) ON DELETE RESTRICT,
  currency           VARCHAR(8),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_variant_product_size_color
  ON product_variants (product_id, size, color_id) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_color   ON product_variants(color_id);
CREATE INDEX IF NOT EXISTS idx_variants_active  ON product_variants(is_active);

CREATE TABLE IF NOT EXISTS variant_attribute_values (
  variant_id         UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  attribute_value_id INT  NOT NULL REFERENCES product_attribute_values(id) ON DELETE RESTRICT,
  PRIMARY KEY (variant_id, attribute_value_id)
);

-- =============================================================================
-- 6) IMAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS product_images (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url      VARCHAR(2048) NOT NULL,
  alt_text       VARCHAR(512),
  display_order  INT NOT NULL DEFAULT 0,
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  color_id       INT REFERENCES colors(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_product       ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_images_product_color ON product_images(product_id, color_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_product_primary_image'
  ) THEN
    CREATE UNIQUE INDEX uq_product_primary_image
      ON product_images (product_id)
      WHERE (is_primary);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_product_color_primary_image'
  ) THEN
    CREATE UNIQUE INDEX uq_product_color_primary_image
      ON product_images (product_id, color_id)
      WHERE (is_primary AND color_id IS NOT NULL);
  END IF;
END$$;

-- =============================================================================
-- 7) EXTERNAL PRODUCT REFS
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_external_refs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source              VARCHAR(64) NOT NULL,
  external_product_id VARCHAR(128),
  locale              VARCHAR(16),
  currency            VARCHAR(8),
  canonical_url       VARCHAR(2048),
  raw_payload         JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_external
  ON product_external_refs (source, external_product_id, canonical_url) NULLS NOT DISTINCT;

-- =============================================================================
-- 8) CONVENIENCE VIEW
-- =============================================================================
CREATE OR REPLACE VIEW v_active_variants AS
SELECT
  pv.id                 AS variant_id,
  p.id                  AS product_id,
  p.name                AS product_name,
  p.slug                AS product_slug,
  pv.variant_sku,
  COALESCE(pv.price, p.base_price) AS effective_price,
  pv.quantity_in_stock,
  pv.is_active,
  pv.size,
  pv.fit,
  col.name              AS color_name,
  col.code              AS color_code,
  cat.id                AS category_id,
  cat.name              AS category_name,
  p.status,
  p.is_featured,
  p.gender,
  p.product_type
FROM product_variants pv
JOIN products p      ON p.id = pv.product_id
JOIN categories cat  ON cat.id = p.category_id
LEFT JOIN colors col ON col.id = pv.color_id
WHERE pv.is_active = TRUE AND p.status = 'active';

COMMIT;

