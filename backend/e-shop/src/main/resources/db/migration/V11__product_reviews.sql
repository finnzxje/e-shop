-- V11__product_reviews.sql
-- Simple product reviews table

BEGIN;

CREATE TABLE IF NOT EXISTS product_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  order_item_id     UUID REFERENCES order_items(id) ON DELETE SET NULL,
  rating            INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text       TEXT NOT NULL,
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_created_at
  ON product_reviews (product_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER trg_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;
