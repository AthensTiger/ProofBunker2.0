-- ================================================================
-- Proof Bunker 2.0 — Schema Patches
-- ================================================================
-- Columns used by the application code but missing from the
-- original schema files. Run AFTER both schema files.
-- ================================================================

-- Users: role column for admin/curator/user authorization
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD CONSTRAINT chk_user_role CHECK (role IN ('user', 'curator', 'admin'));

-- Companies: verification flag for admin curation workflow
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Distillers: verification flag for admin curation workflow
ALTER TABLE distillers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Product UPCs: updated_at for admin UPC edits
ALTER TABLE product_upcs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
