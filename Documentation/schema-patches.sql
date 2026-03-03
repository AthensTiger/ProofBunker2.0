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
