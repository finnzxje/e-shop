CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token         VARCHAR(255) NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    confirmed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_email_verification_tokens_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS ix_email_verification_tokens_user_id
    ON email_verification_tokens (user_id);

ALTER TABLE users
    ALTER COLUMN enabled SET DEFAULT false;
