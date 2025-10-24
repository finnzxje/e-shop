-- V12__add_rating_interaction.sql
-- Introduce RATING interaction type for product reviews.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'interaction_type_enum'
      AND e.enumlabel = 'RATING'
  ) THEN
    ALTER TYPE interaction_type_enum ADD VALUE 'RATING';
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;

