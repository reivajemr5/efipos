-- Migration v8: Change stock fields from Int to Decimal(12,2)
-- Supports fractional stock for bulk products ("a granel")

ALTER TABLE products ALTER COLUMN stock TYPE DECIMAL(12,2) USING stock::DECIMAL(12,2);
ALTER TABLE products ALTER COLUMN stock SET DEFAULT 0;

ALTER TABLE stock_movements ALTER COLUMN quantity TYPE DECIMAL(12,2) USING quantity::DECIMAL(12,2);
ALTER TABLE stock_movements ALTER COLUMN stock_before TYPE DECIMAL(12,2) USING stock_before::DECIMAL(12,2);
ALTER TABLE stock_movements ALTER COLUMN stock_after TYPE DECIMAL(12,2) USING stock_after::DECIMAL(12,2);
