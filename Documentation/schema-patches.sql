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

-- Bunker bottles: extend status constraint to include 'empty'
ALTER TABLE bunker_bottles DROP CONSTRAINT IF EXISTS chk_bottle_status;
ALTER TABLE bunker_bottles ADD CONSTRAINT chk_bottle_status CHECK (status IN ('sealed', 'opened', 'empty'));

-- Users: email_verified flag for manual admin approval of new users
-- Default TRUE so existing users keep access; new users are inserted with FALSE
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- ================================================================
-- Support: chat messages and support tickets
-- ================================================================

CREATE TABLE IF NOT EXISTS support_chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_chat_user ON support_chat_messages(user_id, created_at);

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ticket_type VARCHAR(20) CHECK (ticket_type IN ('bug', 'enhancement', 'question', 'other')),
  claude_analysis TEXT,
  claude_suggested_fix TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- ================================================================
-- Phase 1: Direct Messaging
-- ================================================================

CREATE TABLE IF NOT EXISTS users_conversations (
  id SERIAL PRIMARY KEY,
  user_ids INTEGER[] NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_users ON users_conversations USING GIN(user_ids);

CREATE TABLE IF NOT EXISTS users_direct_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES users_conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dm_conv ON users_direct_messages(conversation_id, created_at);

-- ================================================================
-- Phase 2: Blog / Content System
-- ================================================================

CREATE TABLE IF NOT EXISTS user_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'published', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_posts_user ON user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_status ON user_posts(status);

CREATE TABLE IF NOT EXISTS post_approvals (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  curator_id INTEGER NOT NULL REFERENCES users(id),
  decision VARCHAR(10) NOT NULL CHECK (decision IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- Notifications (required by Phase 1 messaging + Phase 2 posts)
-- ================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);

-- ================================================================
-- Feature Flags
-- Admin controls which optional features are enabled per user.
-- Default OFF for new users: messages, posts.
-- My Bunker, Print Bunker, Shared With Me, Support, Settings
-- are always available and not controlled here.
-- ================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{"messages": false, "posts": false}';

-- ================================================================
-- Logo URLs for users and storage locations
-- Used for Print Bunker watermarks:
--   - If all items from one location with logo → use location logo
--   - Otherwise → use user's bunker logo
-- ================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1000);
ALTER TABLE user_storage_locations ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1000);

-- ================================================================
-- Release Notes / What's New
-- Admin-authored changelog entries shown to all users.
-- last_release_notes_viewed_at tracks per-user read position.
-- ================================================================

CREATE TABLE IF NOT EXISTS release_notes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'enhancement'
    CHECK (type IN ('bug_fix', 'enhancement', 'new_feature', 'other')),
  version VARCHAR(20),
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_release_notes_created ON release_notes(created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_release_notes_viewed_at TIMESTAMPTZ;

-- ================================================================
-- Bunker Item — Personal Override Fields
-- Nullable overrides that take precedence over the master product
-- values when set. NULL means "use the product value".
--
-- Overrides with product-level counterparts (COALESCE in queries):
--   release_year, proof, abv, age_statement, mash_bill
--
-- Override-only fields (no product fallback):
--   batch_number, barrel_number, year_distilled
-- ================================================================
ALTER TABLE bunker_items ADD COLUMN IF NOT EXISTS batch_number  VARCHAR(100);
ALTER TABLE bunker_items ADD COLUMN IF NOT EXISTS barrel_number VARCHAR(100);
ALTER TABLE bunker_items ADD COLUMN IF NOT EXISTS year_distilled INTEGER;
ALTER TABLE bunker_items ADD COLUMN IF NOT EXISTS release_year   INTEGER;
ALTER TABLE bunker_items ADD COLUMN IF NOT EXISTS proof          DOUBLE PRECISION;
ALTER TABLE bunker_items ADD COLUMN IF NOT EXISTS abv            DECIMAL(5,4);
ALTER TABLE bunker_items ADD COLUMN IF NOT EXISTS age_statement  VARCHAR(100);
ALTER TABLE bunker_items ADD COLUMN IF NOT EXISTS mash_bill      VARCHAR(500);

-- ================================================================
-- Fuzzy search: trigram similarity for product autocomplete
-- ================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ================================================================
-- Bunker Bottle — Per-Bottle Detail Fields (Option A)
-- Details moved from bunker_items to bunker_bottles so each
-- physical bottle carries its own independent values.
-- COALESCE(bb.field, p.field) used for fields with product fallback.
-- ================================================================
ALTER TABLE bunker_bottles ADD COLUMN IF NOT EXISTS batch_number   VARCHAR(100);
ALTER TABLE bunker_bottles ADD COLUMN IF NOT EXISTS barrel_number  VARCHAR(100);
ALTER TABLE bunker_bottles ADD COLUMN IF NOT EXISTS year_distilled INTEGER;
ALTER TABLE bunker_bottles ADD COLUMN IF NOT EXISTS release_year   INTEGER;
ALTER TABLE bunker_bottles ADD COLUMN IF NOT EXISTS proof          DOUBLE PRECISION;
ALTER TABLE bunker_bottles ADD COLUMN IF NOT EXISTS abv            DECIMAL(5,4);
ALTER TABLE bunker_bottles ADD COLUMN IF NOT EXISTS age_statement  VARCHAR(100);
ALTER TABLE bunker_bottles ADD COLUMN IF NOT EXISTS mash_bill      VARCHAR(500);

-- ================================================================
-- Unresolved Bottle Scans — Deferred Barcode Resolution
-- When a scanned UPC has no product match, save the raw barcode
-- + location + photos here. Resolve to a real bottle later.
-- ================================================================
CREATE TABLE IF NOT EXISTS unresolved_bottle_scans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upc VARCHAR(50) NOT NULL,
  storage_location_id INTEGER REFERENCES user_storage_locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unresolved_scans_user
  ON unresolved_bottle_scans(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS unresolved_scan_photos (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES unresolved_bottle_scans(id) ON DELETE CASCADE,
  cdn_url VARCHAR(1000) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
