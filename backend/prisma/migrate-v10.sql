-- Add balance column to invoices for credit tracking
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) NOT NULL DEFAULT 0;
