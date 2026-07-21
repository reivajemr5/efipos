-- Migration v3: Stock movements
CREATE TABLE IF NOT EXISTS "stock_movements" (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES "products"(id),
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    reference TEXT,
    notes TEXT,
    user_id INTEGER REFERENCES "users"(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
