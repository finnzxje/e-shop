-- V9__drop_interaction_value.sql
-- Remove unused interaction_value column from product_interaction_events

BEGIN;

ALTER TABLE product_interaction_events
  DROP COLUMN IF EXISTS interaction_value;

COMMIT;
