-- V6__uppercase_order_payment_enums.sql
-- Normalize enum labels created in V5 to uppercase for consistency with Java enums

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'order_status_enum' AND e.enumlabel = 'pending') THEN
    ALTER TYPE order_status_enum RENAME VALUE 'pending' TO 'PENDING';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'order_status_enum' AND e.enumlabel = 'awaiting_payment') THEN
    ALTER TYPE order_status_enum RENAME VALUE 'awaiting_payment' TO 'AWAITING_PAYMENT';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'order_status_enum' AND e.enumlabel = 'processing') THEN
    ALTER TYPE order_status_enum RENAME VALUE 'processing' TO 'PROCESSING';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'order_status_enum' AND e.enumlabel = 'fulfilled') THEN
    ALTER TYPE order_status_enum RENAME VALUE 'fulfilled' TO 'FULFILLED';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'order_status_enum' AND e.enumlabel = 'cancelled') THEN
    ALTER TYPE order_status_enum RENAME VALUE 'cancelled' TO 'CANCELLED';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_status_enum' AND e.enumlabel = 'pending') THEN
    ALTER TYPE payment_status_enum RENAME VALUE 'pending' TO 'PENDING';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_status_enum' AND e.enumlabel = 'authorized') THEN
    ALTER TYPE payment_status_enum RENAME VALUE 'authorized' TO 'AUTHORIZED';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_status_enum' AND e.enumlabel = 'captured') THEN
    ALTER TYPE payment_status_enum RENAME VALUE 'captured' TO 'CAPTURED';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_status_enum' AND e.enumlabel = 'failed') THEN
    ALTER TYPE payment_status_enum RENAME VALUE 'failed' TO 'FAILED';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_status_enum' AND e.enumlabel = 'voided') THEN
    ALTER TYPE payment_status_enum RENAME VALUE 'voided' TO 'VOIDED';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_method_enum' AND e.enumlabel = 'card') THEN
    ALTER TYPE payment_method_enum RENAME VALUE 'card' TO 'CARD';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_method_enum' AND e.enumlabel = 'cash_on_delivery') THEN
    ALTER TYPE payment_method_enum RENAME VALUE 'cash_on_delivery' TO 'CASH_ON_DELIVERY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_method_enum' AND e.enumlabel = 'bank_transfer') THEN
    ALTER TYPE payment_method_enum RENAME VALUE 'bank_transfer' TO 'BANK_TRANSFER';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_method_enum' AND e.enumlabel = 'wallet') THEN
    ALTER TYPE payment_method_enum RENAME VALUE 'wallet' TO 'WALLET';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_method_enum' AND e.enumlabel = 'manual') THEN
    ALTER TYPE payment_method_enum RENAME VALUE 'manual' TO 'MANUAL';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'payment_method_enum' AND e.enumlabel = 'unknown') THEN
    ALTER TYPE payment_method_enum RENAME VALUE 'unknown' TO 'UNKNOWN';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'order_address_type_enum' AND e.enumlabel = 'shipping') THEN
    ALTER TYPE order_address_type_enum RENAME VALUE 'shipping' TO 'SHIPPING';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'order_address_type_enum' AND e.enumlabel = 'billing') THEN
    ALTER TYPE order_address_type_enum RENAME VALUE 'billing' TO 'BILLING';
  END IF;
END$$;

-- Refresh defaults to ensure they reference the renamed enum labels
ALTER TABLE orders
  ALTER COLUMN status SET DEFAULT 'PENDING',
  ALTER COLUMN payment_status SET DEFAULT 'PENDING',
  ALTER COLUMN payment_method SET DEFAULT 'UNKNOWN';

ALTER TABLE payment_transactions
  ALTER COLUMN status SET DEFAULT 'PENDING',
  ALTER COLUMN method SET DEFAULT 'UNKNOWN';
