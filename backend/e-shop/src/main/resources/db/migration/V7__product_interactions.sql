-- V7__product_interactions.sql
-- Adds product view tracking table and unified interaction events log.
-- Captures browse and commerce events for analytics and recommendation pipelines.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_type_enum') THEN
    CREATE TYPE interaction_type_enum AS ENUM (
      'VIEW',
      'ADD_TO_CART',
      'REMOVE_FROM_CART',
      'PURCHASE',
      'WISHLIST',
      'LIKE',
      'RECOMMENDATION_CLICK'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS product_interaction_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id        UUID,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  interaction_type  interaction_type_enum NOT NULL,
  interaction_value NUMERIC(12,4),
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pie_user_time
  ON product_interaction_events(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_pie_product_time
  ON product_interaction_events(product_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_pie_type_time
  ON product_interaction_events(interaction_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_pie_session
  ON product_interaction_events(session_id);

CREATE TABLE IF NOT EXISTS product_views (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id   UUID,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id   UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  viewed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_views_user_viewed_at
  ON product_views(user_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_views_product_viewed_at
  ON product_views(product_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_views_variant
  ON product_views(variant_id);

CREATE INDEX IF NOT EXISTS idx_product_views_session
  ON product_views(session_id);

CREATE OR REPLACE FUNCTION trg_product_views_to_events()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_interaction_events (
    user_id,
    session_id,
    product_id,
    variant_id,
    interaction_type,
    interaction_value,
    metadata,
    occurred_at
  )
  VALUES (
    NEW.user_id,
    NEW.session_id,
    NEW.product_id,
    NEW.variant_id,
    'VIEW',
    NULL,
    NEW.metadata,
    NEW.viewed_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_views_mirror ON product_views;
CREATE TRIGGER trg_product_views_mirror
  AFTER INSERT ON product_views
  FOR EACH ROW
  EXECUTE FUNCTION trg_product_views_to_events();

COMMIT;
