CREATE TABLE IF NOT EXISTS product_variant_stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    delta INT NOT NULL,
    reason VARCHAR(128) NOT NULL,
    notes TEXT,
    adjusted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    adjusted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variant_stock_adjustments_variant
    ON product_variant_stock_adjustments (variant_id, adjusted_at DESC);
