-- V10__update_product_views_trigger.sql
-- Align product views trigger with removal of interaction_value column

BEGIN;

DROP TRIGGER IF EXISTS trg_product_views_mirror ON product_views;
DROP FUNCTION IF EXISTS trg_product_views_to_events();

CREATE OR REPLACE FUNCTION trg_product_views_to_events()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_interaction_events (
    user_id,
    session_id,
    product_id,
    variant_id,
    interaction_type,
    metadata,
    occurred_at
  )
  VALUES (
    NEW.user_id,
    NEW.session_id,
    NEW.product_id,
    NEW.variant_id,
    'VIEW',
    NEW.metadata,
    NEW.viewed_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_views_mirror
  AFTER INSERT ON product_views
  FOR EACH ROW
  EXECUTE FUNCTION trg_product_views_to_events();

COMMIT;
