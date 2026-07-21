-- Migration v2: Categories, ProductBarcodes, price2, notes, variations, type
CREATE TABLE IF NOT EXISTS "categories" (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "product_barcodes" (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES "products"(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL
);

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'simple';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS price_2 DECIMAL(12,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES "categories"(id);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]'::jsonb;
