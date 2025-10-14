-- V5__orders_payments_core.sql
-- Orders and payments foundational schema for the e-shop backend
-- Dialect: PostgreSQL
-- Scope:
--   - customer addresses (reusable)
--   - order core (totals, statuses, audit helpers)
--   - order address snapshots
--   - order items with pricing breakdown
--   - order status history (auditable trail)
--   - payment transactions logging

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- ENUM TYPES
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
    CREATE TYPE order_status_enum AS ENUM (
      'pending',
      'awaiting_payment',
      'processing',
      'fulfilled',
      'cancelled'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE payment_status_enum AS ENUM (
      'pending',
      'authorized',
      'captured',
      'failed',
      'voided'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
    CREATE TYPE payment_method_enum AS ENUM (
      'card',
      'cash_on_delivery',
      'bank_transfer',
      'wallet',
      'manual',
      'unknown'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_address_type_enum') THEN
    CREATE TYPE order_address_type_enum AS ENUM ('shipping', 'billing');
  END IF;
END$$;

-- =========================================================================
-- ADDRESS BOOK (per user)
-- =========================================================================
CREATE TABLE IF NOT EXISTS addresses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label                  VARCHAR(100),
  recipient_name         VARCHAR(150) NOT NULL,
  phone                  VARCHAR(30),
  line1                  VARCHAR(255) NOT NULL,
  line2                  VARCHAR(255),
  city                   VARCHAR(120) NOT NULL,
  state_province         VARCHAR(120),
  postal_code            VARCHAR(32),
  country_code           CHAR(2) NOT NULL,
  is_default             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_addresses_country_code CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT chk_addresses_not_blank CHECK (trim(line1) <> ''),
  CONSTRAINT chk_addresses_default_has_user
    CHECK (is_default = FALSE OR user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_addresses_default
  ON addresses(user_id)
  WHERE is_default;

DROP TRIGGER IF EXISTS trg_addresses_updated_at ON addresses;
CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- ORDERS CORE
-- =========================================================================
CREATE SEQUENCE IF NOT EXISTS seq_order_number START WITH 10000 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS orders (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number               VARCHAR(32) NOT NULL UNIQUE
                              DEFAULT 'ORD-' || LPAD(nextval('seq_order_number')::TEXT, 8, '0'),
  user_id                    UUID REFERENCES users(id) ON DELETE SET NULL,
  cart_id                    UUID REFERENCES carts(id) ON DELETE SET NULL,
  status                     order_status_enum NOT NULL DEFAULT 'pending',
  payment_status             payment_status_enum NOT NULL DEFAULT 'pending',
  payment_method             payment_method_enum NOT NULL DEFAULT 'unknown',
  currency                   VARCHAR(8) NOT NULL DEFAULT 'USD',
  subtotal_amount            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_amount            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  tax_amount                 NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount               NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes                      TEXT,
  shipping_method            VARCHAR(64),
  shipping_tracking_number   VARCHAR(128),
  placed_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at                    TIMESTAMPTZ,
  fulfilled_at               TIMESTAMPTZ,
  cancelled_at               TIMESTAMPTZ,
  shipping_address_id        UUID,
  billing_address_id         UUID,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_orders_discount_le_subtotal CHECK (discount_amount <= subtotal_amount),
  CONSTRAINT chk_orders_currency CHECK (trim(currency) <> '')
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON orders(placed_at);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- ORDER ADDRESS SNAPSHOTS
-- =========================================================================
CREATE TABLE IF NOT EXISTS order_addresses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  address_id       UUID REFERENCES addresses(id) ON DELETE SET NULL,
  address_type     order_address_type_enum NOT NULL,
  recipient_name   VARCHAR(150) NOT NULL,
  phone            VARCHAR(30),
  line1            VARCHAR(255) NOT NULL,
  line2            VARCHAR(255),
  city             VARCHAR(120) NOT NULL,
  state_province   VARCHAR(120),
  postal_code      VARCHAR(32),
  country_code     CHAR(2) NOT NULL,
  instructions     TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_order_addresses_country_code CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT chk_order_addresses_not_blank CHECK (trim(line1) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_addresses_order_type
  ON order_addresses(order_id, address_type);

CREATE INDEX IF NOT EXISTS idx_order_addresses_order ON order_addresses(order_id);

DROP TRIGGER IF EXISTS trg_order_addresses_updated_at ON order_addresses;
CREATE TRIGGER trg_order_addresses_updated_at
  BEFORE UPDATE ON order_addresses
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_shipping_address
  FOREIGN KEY (shipping_address_id)
  REFERENCES order_addresses(id)
  ON DELETE SET NULL;

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_billing_address
  FOREIGN KEY (billing_address_id)
  REFERENCES order_addresses(id)
  ON DELETE SET NULL;

-- =========================================================================
-- ORDER ITEMS
-- =========================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id       UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity         INT NOT NULL CHECK (quantity > 0),
  unit_price       NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  discount_amount  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount     NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  currency         VARCHAR(8) NOT NULL,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_order_items_discount_bound CHECK (discount_amount <= unit_price * quantity)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);

DROP TRIGGER IF EXISTS trg_order_items_updated_at ON order_items;
CREATE TRIGGER trg_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- ORDER STATUS HISTORY
-- =========================================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status           order_status_enum NOT NULL,
  payment_status   payment_status_enum,
  changed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  comment          TEXT,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON order_status_history(changed_at);

-- =========================================================================
-- PAYMENT TRANSACTIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider                   VARCHAR(64) NOT NULL,
  provider_transaction_id    VARCHAR(128),
  idempotency_key            VARCHAR(128),
  amount                     NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency                   VARCHAR(8) NOT NULL,
  status                     payment_status_enum NOT NULL DEFAULT 'pending',
  method                     payment_method_enum NOT NULL DEFAULT 'unknown',
  captured_amount            NUMERIC(12,2) CHECK (captured_amount IS NULL OR captured_amount >= 0),
  raw_response               JSONB,
  error_code                 VARCHAR(64),
  error_message              TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_currency CHECK (trim(currency) <> ''),
  CONSTRAINT chk_payment_captured_le_amount
    CHECK (captured_amount IS NULL OR captured_amount <= amount)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transactions_provider_ref
  ON payment_transactions(provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transactions_idempotency
  ON payment_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP TRIGGER IF EXISTS trg_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;
