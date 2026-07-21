-- Migration v6: Brands table
CREATE TABLE IF NOT EXISTS "brands" (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES "brands"(id);
ALTER TABLE "products" DROP COLUMN IF EXISTS brand;
