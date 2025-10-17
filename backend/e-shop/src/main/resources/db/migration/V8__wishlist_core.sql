-- V8__wishlist_core.sql
-- Minimal wishlist support: each user has a single implicit wishlist of saved products.

BEGIN;

CREATE TABLE IF NOT EXISTS wishlist_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a product can only appear once per user's wishlist
CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_items_user_product
    ON wishlist_items (user_id, product_id);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_user
    ON wishlist_items (user_id);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_product
    ON wishlist_items (product_id);

COMMIT;
