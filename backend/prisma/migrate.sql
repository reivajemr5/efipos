-- Migration SQL for Efi- Pos (generated from Prisma schema)
-- Execute via: PGPASSWORD="..." psql -h host -U postgres -d postgres -f migrate.sql

CREATE TYPE "Role" AS ENUM ('dueno', 'admin', 'cajero');
CREATE TYPE "Currency" AS ENUM ('bs', 'usd');
CREATE TYPE "InvoiceStatus" AS ENUM ('activa', 'anulada');
CREATE TYPE "QuoteStatus" AS ENUM ('activa', 'convertida', 'vencida');

CREATE TABLE "users" (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role "Role" NOT NULL DEFAULT 'cajero',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "clients" (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_number TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "suppliers" (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_number TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "product_suppliers" (
    product_id INTEGER NOT NULL REFERENCES "products"(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES "suppliers"(id) ON DELETE CASCADE,
    price DECIMAL(12,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_id, supplier_id)
);

CREATE TABLE "products" (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    currency "Currency" NOT NULL DEFAULT 'bs',
    iva_percent DECIMAL(5,2) NOT NULL DEFAULT 16,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "exchange_rates" (
    id SERIAL PRIMARY KEY,
    rate DECIMAL(14,4) NOT NULL,
    source TEXT NOT NULL DEFAULT 'bcv',
    date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "quotes" (
    id SERIAL PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES "clients"(id),
    user_id INTEGER NOT NULL REFERENCES "users"(id),
    currency "Currency" NOT NULL DEFAULT 'usd',
    exchange_rate DECIMAL(14,4),
    subtotal DECIMAL(12,2) NOT NULL,
    iva_total DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    total_bs DECIMAL(14,2),
    status "QuoteStatus" NOT NULL DEFAULT 'activa',
    valid_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "quote_items" (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL REFERENCES "quotes"(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES "products"(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    iva_percent DECIMAL(5,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);

CREATE TABLE "invoices" (
    id SERIAL PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES "clients"(id),
    user_id INTEGER NOT NULL REFERENCES "users"(id),
    quote_id INTEGER UNIQUE REFERENCES "quotes"(id),
    currency "Currency" NOT NULL DEFAULT 'usd',
    exchange_rate DECIMAL(14,4),
    subtotal DECIMAL(12,2) NOT NULL,
    iva_total DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    total_bs DECIMAL(14,2),
    status "InvoiceStatus" NOT NULL DEFAULT 'activa',
    payment_method TEXT NOT NULL DEFAULT 'efectivo',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMP
);

CREATE TABLE "invoice_items" (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES "invoices"(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES "products"(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    iva_percent DECIMAL(5,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);

CREATE TABLE "cash_closes" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "users"(id),
    expected_total DECIMAL(12,2) NOT NULL,
    declared_total DECIMAL(12,2) NOT NULL,
    difference DECIMAL(12,2) NOT NULL,
    close_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2026-07-20: Add barcode and cost to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS cost DECIMAL(12,2);

-- 2026-07-20: Add PurchaseStatus enum and purchase tables
DO $$ BEGIN CREATE TYPE "PurchaseStatus" AS ENUM ('pedido', 'recibido', 'pagada', 'anulada'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "product_suppliers" (
    product_id INTEGER NOT NULL REFERENCES "products"(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES "suppliers"(id) ON DELETE CASCADE,
    price DECIMAL(12,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS "purchase_invoices" (
    id SERIAL PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL REFERENCES "suppliers"(id),
    user_id INTEGER NOT NULL REFERENCES "users"(id),
    currency "Currency" NOT NULL DEFAULT 'usd',
    exchange_rate DECIMAL(14,4),
    subtotal DECIMAL(12,2) NOT NULL,
    iva_total DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    total_bs DECIMAL(14,2),
    status "PurchaseStatus" NOT NULL DEFAULT 'pedido',
    payment_method TEXT NOT NULL DEFAULT 'efectivo',
    due_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "purchase_invoice_items" (
    id SERIAL PRIMARY KEY,
    purchase_invoice_id INTEGER NOT NULL REFERENCES "purchase_invoices"(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES "products"(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    iva_percent DECIMAL(5,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);
