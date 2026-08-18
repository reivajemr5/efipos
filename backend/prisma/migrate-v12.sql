-- Migration v12: Configuración configurable de ventas
-- Cantidades decimales (al peso), venta sin stock y cambio de precio en factura.

-- 1) Modos de configuración por negocio ('all' | 'selected' | 'none')
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS decimal_quantity_mode TEXT NOT NULL DEFAULT 'none';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sell_without_stock_mode TEXT NOT NULL DEFAULT 'none';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS price_override_mode TEXT NOT NULL DEFAULT 'none';

-- 2) Banderas por producto
ALTER TABLE products ADD COLUMN IF NOT EXISTS decimal_quantity BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_without_stock BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_override BOOLEAN NOT NULL DEFAULT FALSE;

-- 3) Cantidades con decimales en facturas, cotizaciones y compras
ALTER TABLE quote_items ALTER COLUMN quantity SET DEFAULT 1;
ALTER TABLE quote_items ALTER COLUMN quantity TYPE DECIMAL(12,3);

ALTER TABLE invoice_items ALTER COLUMN quantity SET DEFAULT 1;
ALTER TABLE invoice_items ALTER COLUMN quantity TYPE DECIMAL(12,3);

ALTER TABLE purchase_invoice_items ALTER COLUMN quantity SET DEFAULT 1;
ALTER TABLE purchase_invoice_items ALTER COLUMN quantity TYPE DECIMAL(12,3);