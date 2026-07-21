-- Migration v4: Payments tracking
CREATE TABLE IF NOT EXISTS "payments" (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES "invoices"(id),
    purchase_invoice_id INTEGER REFERENCES "purchase_invoices"(id),
    amount DECIMAL(12,2) NOT NULL,
    method TEXT NOT NULL DEFAULT 'efectivo',
    reference TEXT,
    notes TEXT,
    user_id INTEGER NOT NULL REFERENCES "users"(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_purchase ON payments(purchase_invoice_id);
