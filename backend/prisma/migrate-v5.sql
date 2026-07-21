-- Migration v5: Brand field + Attribute Templates
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE TABLE IF NOT EXISTS "attribute_templates" (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "attribute_template_values" (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES "attribute_templates"(id) ON DELETE CASCADE,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attribute_template_values_template ON attribute_template_values(template_id);
