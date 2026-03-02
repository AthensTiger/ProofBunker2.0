-- ================================================================
-- Proof Bunker 2.0 — Reference/Master Data Schema (PostgreSQL)
-- ================================================================
-- This schema covers the shared product catalog: spirits, distillers,
-- companies, images, UPCs, ratings, and awards.
--
-- User-side tables (collections, profiles, user tasting notes, etc.)
-- will be designed separately.
--
-- NOTE: Only products with at least one UPC barcode are migrated
-- from the SQLite seed database, along with their related records.
-- ================================================================

-- ============================================
-- COMPANIES
-- Brand owners / marketing companies.
-- Distinct from distillers (physical facilities).
-- Supports parent company hierarchy.
-- ============================================
CREATE TABLE companies (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(500)    NOT NULL,
    slug            VARCHAR(500)    NOT NULL UNIQUE,
    website         VARCHAR(500),
    parent_company_id INTEGER       REFERENCES companies(id) ON DELETE SET NULL,
    country         VARCHAR(100),
    description     TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_parent_company_id ON companies(parent_company_id);
CREATE INDEX idx_companies_country ON companies(country);


-- ============================================
-- DISTILLERS
-- Physical distillery / production facilities.
-- ============================================
CREATE TABLE distillers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(500)    NOT NULL,
    slug            VARCHAR(500)    NOT NULL UNIQUE,
    country         VARCHAR(100),
    region          VARCHAR(200),
    city            VARCHAR(200),
    address         VARCHAR(500),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    website         VARCHAR(500),
    founded_year    INTEGER,
    status          VARCHAR(20)     DEFAULT 'active',
    description     TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_distillers_country ON distillers(country);
CREATE INDEX idx_distillers_region ON distillers(region);


-- ============================================
-- PRODUCTS
-- Core spirit product records (one row per distinct bottling).
--
-- ABV is stored as a DECIMAL FRACTION: 0.40 = 40%.
-- Proof is typically ABV × 2 (US convention).
--
-- spirit_type values:
--   whiskey, tequila, mezcal, rum, vodka, gin, brandy, liqueur, other
--
-- See DATABASE_REFERENCE.md §6 for spirit_subtype values per type.
-- ============================================
CREATE TABLE products (
    id                  SERIAL PRIMARY KEY,
    distiller_id        INTEGER         REFERENCES distillers(id) ON DELETE SET NULL,
    company_id          INTEGER         REFERENCES companies(id) ON DELETE SET NULL,
    name                VARCHAR(500)    NOT NULL,
    slug                VARCHAR(500)    NOT NULL,
    upc                 VARCHAR(13),            -- canonical UPC (denormalized from product_upcs)
    spirit_type         VARCHAR(50)     NOT NULL,
    spirit_subtype      VARCHAR(50),
    abv                 DOUBLE PRECISION,       -- decimal: 0.40 = 40%
    proof               DOUBLE PRECISION,
    age_statement       VARCHAR(100),           -- free text: "12", "12 Year", "NAS"
    volume_ml           INTEGER,
    mash_bill           VARCHAR(300),           -- e.g. "75% corn, 13% rye, 12% malted barley"
    barrel_type         VARCHAR(200),           -- e.g. "new, charred American oak"
    barrel_char_level   VARCHAR(50),            -- e.g. "#4 Char"
    finish_type         VARCHAR(200),           -- e.g. "Port Cask Finish"
    distillation_method VARCHAR(200),           -- e.g. "Pot Still"
    batch_number        VARCHAR(100),
    barrel_number       VARCHAR(100),
    vintage_year        INTEGER,
    release_year        INTEGER,
    is_limited_edition  BOOLEAN         DEFAULT FALSE,
    is_discontinued     BOOLEAN         DEFAULT FALSE,
    is_single_cask      BOOLEAN         DEFAULT FALSE,
    cask_strength       BOOLEAN         DEFAULT FALSE,
    msrp_usd            DOUBLE PRECISION,
    description         TEXT,

    -- Submission / approval workflow
    -- All migrated (scraped) products default to 'approved'.
    -- User-submitted products start as 'pending'.
    -- Rejected products remain visible only to the submitter.
    -- If submitter deletes a rejected product from their bunker,
    -- the rejected master record is also deleted.
    approval_status     VARCHAR(20)     NOT NULL DEFAULT 'approved',
    submitted_by_user_id INTEGER,               -- FK added after users table exists (see schema-user-data.sql)

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_product_slug_distiller UNIQUE (slug, distiller_id),
    CONSTRAINT chk_approval_status CHECK (approval_status IN ('approved', 'pending', 'rejected'))
);

-- Validate spirit_type to the canonical set
ALTER TABLE products ADD CONSTRAINT chk_spirit_type
    CHECK (spirit_type IN (
        'whiskey', 'tequila', 'mezcal', 'rum',
        'vodka', 'gin', 'brandy', 'liqueur', 'other'
    ));

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_spirit_type ON products(spirit_type);
CREATE INDEX idx_products_type_name ON products(spirit_type, name);
CREATE INDEX idx_products_distiller_id ON products(distiller_id);
CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_upc ON products(upc);
CREATE INDEX idx_products_name ON products(name);


-- ============================================
-- PRODUCT_IMAGES
-- Bottle images. Stored in cloud object storage (S3/R2).
--
-- source_url  = original URL from the scraper source
-- storage_key = object key in cloud storage (e.g. "images/angel-s-envy-rye.jpg")
-- cdn_url     = public CDN URL for serving to browsers
-- ============================================
CREATE TABLE product_images (
    id                  SERIAL PRIMARY KEY,
    product_id          INTEGER         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    source_url          VARCHAR(1000),          -- original scraper image URL
    storage_key         VARCHAR(500),           -- cloud object storage key
    cdn_url             VARCHAR(1000),          -- full public CDN URL
    is_primary          BOOLEAN         DEFAULT FALSE,
    image_type          VARCHAR(20)     DEFAULT 'bottle',   -- bottle, label, box
    perceptual_hash     VARCHAR(64),
    embedding_vector    BYTEA,
    extracted_text      TEXT,
    label_confidence    DOUBLE PRECISION,
    downloaded_at       TIMESTAMPTZ,
    processed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_perceptual_hash ON product_images(perceptual_hash);


-- ============================================
-- PRODUCT_UPCS
-- UPC barcodes. A product can have multiple UPCs
-- for different bottle sizes/containers.
--
-- is_canonical = TRUE for the 750ml glass bottle entry.
-- ============================================
CREATE TABLE product_upcs (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upc             VARCHAR(13)     NOT NULL,
    size_ml         INTEGER,
    container_type  VARCHAR(50),                -- Glass Bottle, Plastic Bottle, etc.
    source          VARCHAR(100),               -- origin of this UPC data
    is_canonical    BOOLEAN         DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_product_upc UNIQUE (product_id, upc)
);

CREATE INDEX idx_product_upcs_product_id ON product_upcs(product_id);
CREATE INDEX idx_product_upcs_upc ON product_upcs(upc);


-- ============================================
-- TASTING_NOTES
-- Reference ratings from scraped sources (read-only).
-- User-generated tasting notes will be a separate table.
--
-- Since we dropped the sources table, source_name is
-- denormalized here for provenance.
--
-- rating_scale: "5" (community) or "100" (expert)
-- reviewer_type: "community" or "expert"
-- ============================================
CREATE TABLE tasting_notes (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    source_name     VARCHAR(100),               -- e.g. "distiller_com", "mezcal_reviews"
    nose            TEXT,
    palate          TEXT,
    finish          TEXT,
    overall_notes   TEXT,
    rating_value    DOUBLE PRECISION,
    rating_scale    VARCHAR(20),                -- "5" or "100"
    reviewer_type   VARCHAR(20),                -- "community" or "expert"
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasting_notes_product_id ON tasting_notes(product_id);


-- ============================================
-- AWARDS
-- Competition awards (schema ready, not yet populated).
-- ============================================
CREATE TABLE awards (
    id                  SERIAL PRIMARY KEY,
    product_id          INTEGER         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    competition_name    VARCHAR(300),
    year                INTEGER,
    medal               VARCHAR(50),            -- gold, silver, bronze, double_gold, etc.
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_award UNIQUE (product_id, competition_name, year, medal)
);

CREATE INDEX idx_awards_product_id ON awards(product_id);


-- ============================================
-- UPDATED_AT TRIGGER
-- Auto-updates the updated_at column on row modification
-- for tables that have it.
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_distillers_updated_at
    BEFORE UPDATE ON distillers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
