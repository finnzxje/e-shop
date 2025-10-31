-- V15__support_messaging.sql
-- Introduces conversation and message persistence for user-staff communication.
-- Dialect: PostgreSQL

BEGIN;

-- =========================================================================
-- ENUM TYPES
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_conversation_status_enum') THEN
    CREATE TYPE support_conversation_status_enum AS ENUM (
      'OPEN',
      'WAITING_CUSTOMER',
      'WAITING_STAFF',
      'CLOSED'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_sender_type_enum') THEN
    CREATE TYPE support_sender_type_enum AS ENUM (
      'CUSTOMER',
      'STAFF'
    );
  END IF;
END$$;

-- =========================================================================
-- SUPPORT CONVERSATIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS support_conversations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_staff_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  status               support_conversation_status_enum NOT NULL DEFAULT 'OPEN',
  subject              VARCHAR(180),
  last_message_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_support_conversations_subject_not_blank
    CHECK (subject IS NULL OR trim(subject) <> '')
);

CREATE INDEX IF NOT EXISTS idx_support_conversations_customer
  ON support_conversations(customer_id);

CREATE INDEX IF NOT EXISTS idx_support_conversations_assigned_staff
  ON support_conversations(assigned_staff_id)
  WHERE assigned_staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_conversations_status
  ON support_conversations(status);

DROP TRIGGER IF EXISTS trg_support_conversations_updated_at ON support_conversations;
CREATE TRIGGER trg_support_conversations_updated_at
  BEFORE UPDATE ON support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- SUPPORT MESSAGES
-- =========================================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type       support_sender_type_enum NOT NULL,
  body              TEXT NOT NULL,
  attachment_urls   TEXT[] NOT NULL DEFAULT '{}'::text[],
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_support_messages_body_not_blank
    CHECK (trim(body) <> '')
);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_created_at
  ON support_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_support_messages_unread
  ON support_messages(conversation_id)
  WHERE read_at IS NULL;

DROP TRIGGER IF EXISTS trg_support_messages_updated_at ON support_messages;
CREATE TRIGGER trg_support_messages_updated_at
  BEFORE UPDATE ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;
