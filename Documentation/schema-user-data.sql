-- ================================================================
-- Proof Bunker 2.0 — User-Side Schema (PostgreSQL)
-- ================================================================
-- Covers: authentication, bunker (inventory), bottle tracking,
-- user photos, storage locations, product submissions,
-- menu templates, and user preferences.
--
-- Depends on: schema-reference-data.sql (products, etc.)
-- ================================================================


-- ============================================
-- USERS
-- Auth0-linked user accounts.
-- Age verification stored server-side (not localStorage).
-- Preferences (sort, filter, display) stored as JSONB.
-- ============================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    auth0_id        VARCHAR(255)    NOT NULL UNIQUE,
    email           VARCHAR(255)    NOT NULL,
    display_name    VARCHAR(255),
    avatar_url      VARCHAR(1000),
    age_verified    BOOLEAN         NOT NULL DEFAULT FALSE,
    preferences     JSONB           NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- preferences JSONB example:
-- {
--   "bunker_sort_field": "name",
--   "bunker_sort_direction": "asc",
--   "bunker_filters": { "spirit_type": null, "status": null, "location_id": null }
-- }


-- ============================================
-- USER_STORAGE_LOCATIONS
-- Predefined storage locations per user.
-- Users define these first, then assign bottles to them.
-- ============================================
CREATE TABLE user_storage_locations (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200)    NOT NULL,       -- e.g. "Kitchen Bar", "Basement Rack"
    display_order   SMALLINT        DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_location UNIQUE (user_id, name)
);

CREATE INDEX idx_user_storage_locations_user_id ON user_storage_locations(user_id);


-- ============================================
-- BUNKER_ITEMS
-- One row per product per user.
-- Holds personal rating and notes (product-level, not bottle-level).
-- Quantity is derived: COUNT of child bunker_bottles.
-- ============================================
CREATE TABLE bunker_items (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      INTEGER         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    personal_rating SMALLINT,                       -- 1-5 stars, NULL if unrated
    notes           TEXT,                           -- free-text personal notes
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_bunker_item UNIQUE (user_id, product_id),
    CONSTRAINT chk_personal_rating CHECK (personal_rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_bunker_items_user_id ON bunker_items(user_id);
CREATE INDEX idx_bunker_items_product_id ON bunker_items(product_id);


-- ============================================
-- BUNKER_BOTTLES
-- One row per physical bottle.
-- A bunker_item can have many bottles (same product,
-- different locations/statuses).
--
-- Default list view: aggregated to one row per bunker_item.
-- Drill-down / filter by location or status: shows individual bottles.
-- ============================================
CREATE TABLE bunker_bottles (
    id                  SERIAL PRIMARY KEY,
    bunker_item_id      INTEGER         NOT NULL REFERENCES bunker_items(id) ON DELETE CASCADE,
    storage_location_id INTEGER         REFERENCES user_storage_locations(id) ON DELETE SET NULL,
    status              VARCHAR(10)     NOT NULL DEFAULT 'sealed',
    purchase_price      DECIMAL(10,2),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_bottle_status CHECK (status IN ('sealed', 'opened'))
);

CREATE INDEX idx_bunker_bottles_bunker_item_id ON bunker_bottles(bunker_item_id);
CREATE INDEX idx_bunker_bottles_storage_location_id ON bunker_bottles(storage_location_id);
CREATE INDEX idx_bunker_bottles_status ON bunker_bottles(status);


-- ============================================
-- BUNKER_BOTTLE_PHOTOS
-- User-uploaded photos of their specific physical bottles.
-- Up to 5 photos per bottle (enforced in application logic).
-- Stored in cloud object storage (S3/R2).
-- ============================================
CREATE TABLE bunker_bottle_photos (
    id                  SERIAL PRIMARY KEY,
    bunker_bottle_id    INTEGER         NOT NULL REFERENCES bunker_bottles(id) ON DELETE CASCADE,
    storage_key         VARCHAR(500)    NOT NULL,   -- cloud storage key
    cdn_url             VARCHAR(1000)   NOT NULL,   -- full public CDN URL
    display_order       SMALLINT        NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bunker_bottle_photos_bottle_id ON bunker_bottle_photos(bunker_bottle_id);


-- ============================================
-- MENU_TEMPLATES
-- Saved menu report configurations.
-- Users can create multiple templates ("Full Collection",
-- "Whiskey Only", "Party Menu", etc.).
--
-- settings JSONB holds layout/style options.
-- If no menu_template_items exist, the template
-- applies to the user's full bunker.
-- ============================================
CREATE TABLE menu_templates (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200)    NOT NULL,       -- template name, e.g. "Party Menu"
    title           VARCHAR(300),                   -- printed title on the menu
    subtitle        VARCHAR(300),                   -- printed subtitle
    logo_url        VARCHAR(1000),                  -- custom logo (cloud storage)
    settings        JSONB           NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- settings JSONB example:
-- {
--   "group_by": "spirit_type",
--   "show_proof": true,
--   "show_age": true,
--   "show_description": true,
--   "show_rating": true
-- }

CREATE INDEX idx_menu_templates_user_id ON menu_templates(user_id);


-- ============================================
-- MENU_TEMPLATE_ITEMS
-- Specific bunker items included in a menu template.
-- If this table has no rows for a template, the menu
-- includes all items in the user's bunker.
-- ============================================
CREATE TABLE menu_template_items (
    id                  SERIAL PRIMARY KEY,
    menu_template_id    INTEGER         NOT NULL REFERENCES menu_templates(id) ON DELETE CASCADE,
    bunker_item_id      INTEGER         NOT NULL REFERENCES bunker_items(id) ON DELETE CASCADE,
    display_order       SMALLINT        DEFAULT 0,
    section_override    VARCHAR(100),               -- custom section name (overrides spirit_type grouping)

    CONSTRAINT uq_menu_template_item UNIQUE (menu_template_id, bunker_item_id)
);

CREATE INDEX idx_menu_template_items_template_id ON menu_template_items(menu_template_id);


-- ============================================
-- BUNKER_SHARES
-- Read-only sharing of a user's bunker with other users.
-- Owner controls which fields are visible per share.
-- If shared_with_user_id is NULL, the invitee hasn't
-- signed up yet (pending invite by email).
-- ============================================
CREATE TABLE bunker_shares (
    id                      SERIAL PRIMARY KEY,
    owner_user_id           INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_email       VARCHAR(255)    NOT NULL,
    shared_with_user_id     INTEGER         REFERENCES users(id) ON DELETE CASCADE,
    visibility              JSONB           NOT NULL DEFAULT '{
        "show_prices": true,
        "show_locations": true,
        "show_ratings": true,
        "show_photos": true,
        "show_quantities": true
    }',
    status                  VARCHAR(20)     NOT NULL DEFAULT 'pending',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_share_status CHECK (status IN ('pending', 'active')),
    CONSTRAINT uq_bunker_share UNIQUE (owner_user_id, shared_with_email)
);

CREATE INDEX idx_bunker_shares_owner ON bunker_shares(owner_user_id);
CREATE INDEX idx_bunker_shares_shared_with ON bunker_shares(shared_with_user_id);
CREATE INDEX idx_bunker_shares_email ON bunker_shares(shared_with_email);


-- ============================================
-- DEFERRED FK: products.submitted_by_user_id → users.id
-- This column lives in the products table (schema-reference-data.sql)
-- but references users, so the FK is added here after both tables exist.
-- ============================================
ALTER TABLE products
    ADD CONSTRAINT fk_products_submitted_by
    FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_products_submitted_by ON products(submitted_by_user_id);
CREATE INDEX idx_products_approval_status ON products(approval_status);


-- ============================================
-- UPDATED_AT TRIGGERS (user tables)
-- ============================================
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bunker_items_updated_at
    BEFORE UPDATE ON bunker_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bunker_bottles_updated_at
    BEFORE UPDATE ON bunker_bottles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_menu_templates_updated_at
    BEFORE UPDATE ON menu_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bunker_shares_updated_at
    BEFORE UPDATE ON bunker_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
