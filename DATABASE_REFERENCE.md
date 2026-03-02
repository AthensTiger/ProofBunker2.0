# Spirits Database Reference

This document fully describes the SQLite spirits database so that an AI assistant or developer can understand the schema, relationships, data contents, and conventions needed to build applications on top of it.

**Database**: SQLite file at `data/spirits.db` (~342 MB)
**Engine**: SQLite with WAL journal mode and foreign keys enabled
**ORM**: SQLAlchemy (models defined in `spirits_scraper/db/models.py`)
**As of**: February 2026

---

## 1. Overview & Counts

| Table | Rows | Description |
|---|---|---|
| `products` | 66,753 | Core product records (bottles of spirits) |
| `distillers` | 920 | Physical distillery/production facilities |
| `companies` | 5,053 | Brand owners / marketing companies |
| `sources` | 7 | Data sources (scrapers, imports) |
| `product_images` | 63,226 | Bottle images (63,119 downloaded locally, ~4.5 GB) |
| `product_upcs` | 8,468 | UPC barcodes across different bottle sizes |
| `tasting_notes` | 45,807 | Ratings and tasting notes |
| `awards` | 0 | Competition awards (schema exists, not yet populated) |
| `product_source_links` | 68,282 | Links products to their data sources |
| `distiller_source_links` | 920 | Links distillers to their data sources |
| `company_source_links` | 5,106 | Links companies to their data sources |
| `merge_conflicts` | 0 | Conflict tracking (schema exists, not yet populated) |
| `scrape_progress` | 10 | Scraper run tracking |

---

## 2. Entity-Relationship Diagram

```
                  ┌──────────────┐
                  │  companies   │
                  │──────────────│
                  │ id (PK)      │◄─┐ self-referential
                  │ parent_co_id │──┘ (parent company)
                  │ name, slug   │
                  │ country      │
                  └──────┬───────┘
                         │ 1
                         │
                         │ N (optional)
┌──────────────┐  ┌──────┴───────┐  ┌──────────────────┐
│  distillers  │  │   products   │  │  product_images   │
│──────────────│  │──────────────│  │──────────────────│
│ id (PK)      │◄─│ distiller_id │  │ id (PK)          │
│ name, slug   │  │ company_id   │─►│ product_id (FK)  │
│ country      │  │ name, slug   │  │ source_url       │
│ region, city │  │ spirit_type  │  │ local_path       │
│ lat, lng     │  │ abv, proof   │  │ is_primary       │
│ founded_year │  │ upc          │  │ perceptual_hash  │
└──────────────┘  │ msrp_usd     │  └──────────────────┘
                  │ description  │
                  └──┬──┬──┬──┬─┘
                     │  │  │  │
          ┌──────────┘  │  │  └──────────┐
          │             │  │             │
          ▼             ▼  ▼             ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│product_upcs │ │tasting_notes │ │   awards     │
│─────────────│ │──────────────│ │──────────────│
│ product_id  │ │ product_id   │ │ product_id   │
│ upc         │ │ source_id    │ │ competition  │
│ size_ml     │ │ nose,palate  │ │ year, medal  │
│ container   │ │ finish       │ └──────────────┘
│ is_canonical│ │ rating_value │
└─────────────┘ │ rating_scale │
                └──────────────┘

┌──────────┐    ┌──────────────────────┐
│ sources  │◄───│ product_source_links  │
│──────────│    │──────────────────────│
│ id (PK)  │    │ product_id (FK)      │
│ name     │    │ source_id (FK)       │
│ priority │    │ source_product_id    │
│ base_url │    │ source_url           │
└──────────┘    │ raw_data (JSON)      │
     ▲          └──────────────────────┘
     │
     ├──── distiller_source_links
     └──── company_source_links
```

---

## 3. Table Schemas

### 3.1 `products`

The central table. Each row is a distinct spirit product (a specific bottling).

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK, auto | Primary key |
| `distiller_id` | INTEGER | Yes | FK → `distillers.id`. The physical distillery. Only 3.9% populated |
| `company_id` | INTEGER | Yes | FK → `companies.id`. Brand owner. 36.4% populated |
| `name` | VARCHAR(500) | No | Full product name, e.g. "Angel's Envy Rye Finished in Caribbean Rum Casks" |
| `slug` | VARCHAR(500) | No | URL-safe slug, e.g. "angel-s-envy-rye-finished-in-caribbean-rum-casks" |
| `upc` | VARCHAR(13) | Yes | Canonical UPC barcode (typically the 750ml bottle). 7.3% populated |
| `spirit_type` | VARCHAR(50) | Yes | Top-level category. **100% populated.** See allowed values below |
| `spirit_subtype` | VARCHAR(50) | Yes | Sub-category. 11.2% populated. See allowed values below |
| `abv` | FLOAT | Yes | Alcohol by volume **as a decimal** (0.40 = 40%). Range: 0.025–1.0, avg 0.47. **94.7% populated** |
| `proof` | FLOAT | Yes | Proof number (US: ABV × 2). 89.3% populated |
| `age_statement` | VARCHAR(100) | Yes | Free text: "4", "12 Year", "NAS", "8 Years". 37.2% populated |
| `volume_ml` | INTEGER | Yes | Bottle size in ml. **0% populated** (sizes are in `product_upcs` instead) |
| `mash_bill` | VARCHAR(300) | Yes | Grain recipe, e.g. "75% corn, 13% rye, 12% malted barley". 0.2% populated |
| `barrel_type` | VARCHAR(200) | Yes | Aging barrel, e.g. "new, charred American oak". 47.4% populated |
| `barrel_char_level` | VARCHAR(50) | Yes | e.g. "#4 Char", "unknown". 0.3% populated |
| `finish_type` | VARCHAR(200) | Yes | Cask finish, e.g. "Port Cask Finish". 0% populated |
| `distillation_method` | VARCHAR(200) | Yes | e.g. "Pot Still". 0% populated |
| `batch_number` | VARCHAR(100) | Yes | 0% populated |
| `barrel_number` | VARCHAR(100) | Yes | 0% populated |
| `vintage_year` | INTEGER | Yes | 0% populated |
| `release_year` | INTEGER | Yes | 0% populated |
| `is_limited_edition` | BOOLEAN | Yes | Default FALSE. 0 products marked TRUE |
| `is_discontinued` | BOOLEAN | Yes | Default FALSE. 0 products marked TRUE |
| `is_single_cask` | BOOLEAN | Yes | Default FALSE. 0 products marked TRUE |
| `cask_strength` | BOOLEAN | Yes | Default FALSE. 0 products marked TRUE |
| `msrp_usd` | FLOAT | Yes | Manufacturer's suggested retail price in USD. 86.6% populated |
| `description` | TEXT | Yes | Free-text product description. 24.4% populated |
| `created_at` | DATETIME | Yes | UTC timestamp |
| `updated_at` | DATETIME | Yes | UTC timestamp |

**Unique constraint**: `(slug, distiller_id)` — same slug can exist if from different distillers.

**Indexes**: `slug`, `spirit_type`, `distiller_id`, `company_id`, `upc`, `(spirit_type, name)`

#### `spirit_type` Values (exhaustive, all 66,753 products)

| spirit_type | Count | Percentage |
|---|---|---|
| whiskey | 41,676 | 62.4% |
| rum | 4,883 | 7.3% |
| gin | 4,052 | 6.1% |
| tequila | 3,630 | 5.4% |
| liqueur | 3,379 | 5.1% |
| brandy | 2,698 | 4.0% |
| other | 2,221 | 3.3% |
| mezcal | 2,165 | 3.2% |
| vodka | 2,049 | 3.1% |

Note: "whiskey" is the normalized form. Both "whiskey" and "whisky" spellings map to "whiskey".

#### `spirit_subtype` Values (top entries from the 11.2% that have one)

| spirit_subtype | Count | Applies to |
|---|---|---|
| bourbon | 2,204 | whiskey |
| joven | 2,177 | mezcal |
| rye | 752 | whiskey |
| american | 389 | whiskey |
| flavored | 382 | whiskey |
| moonshine | 266 | whiskey |
| blended | 201 | whiskey |
| malt | 198 | whiskey |
| blended bourbon | 130 | whiskey |
| corn | 111 | whiskey |
| bourbon - flavored | 106 | whiskey |
| sotol | 88 | mezcal |
| tennessee | 77 | whiskey |
| wheat | 76 | whiskey |

#### ABV Convention

**IMPORTANT**: ABV is stored as a decimal fraction, NOT a percentage.
- 40% ABV → stored as `0.40`
- 57.5% ABV → stored as `0.575`
- Range in DB: 0.025 to 1.0, average 0.47

Proof is typically `abv * 2` (US convention).

---

### 3.2 `distillers`

Physical distillery or production facility. Distinct from `companies` (brand owners).

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `name` | VARCHAR(500) | No | e.g. "Buffalo Trace", "Barton 1792" |
| `slug` | VARCHAR(500) | No, Unique | URL-safe, used for deduplication |
| `country` | VARCHAR(100) | Yes | e.g. "Mexico", "Scotland", "United States" |
| `region` | VARCHAR(200) | Yes | e.g. "Oaxaca", "Speyside", "Kentucky" |
| `city` | VARCHAR(200) | Yes | |
| `address` | VARCHAR(500) | Yes | |
| `latitude` | FLOAT | Yes | GPS coordinate |
| `longitude` | FLOAT | Yes | GPS coordinate |
| `website` | VARCHAR(500) | Yes | |
| `founded_year` | INTEGER | Yes | |
| `status` | VARCHAR(20) | Yes | Always "active" currently |
| `description` | TEXT | Yes | |
| `created_at` | DATETIME | Yes | |
| `updated_at` | DATETIME | Yes | |

**Top distiller countries**: Mexico (551), Scotland (250), Japan (56), United States (34)

Note: Only 3.9% of products have a `distiller_id`. Most products (especially from UPCData4Spirits import) only have `company_id`.

---

### 3.3 `companies`

Brand owner or marketing company. Supports self-referential parent company hierarchy.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `name` | VARCHAR(500) | No | e.g. "Sazerac Company, Inc.", "Heaven Hill Distilleries" |
| `slug` | VARCHAR(500) | No, Unique | |
| `website` | VARCHAR(500) | Yes | |
| `parent_company_id` | INTEGER | Yes | FK → `companies.id`. Self-referential. Only 1 company currently has this set |
| `country` | VARCHAR(100) | Yes | e.g. "USA", "Mexico", "Scotland" |
| `description` | TEXT | Yes | |
| `created_at` | DATETIME | Yes | |
| `updated_at` | DATETIME | Yes | |

**Top company countries**: USA (2,337), Mexico (802), Scotland (470), France (191)

---

### 3.4 `sources`

Data sources that products were scraped/imported from. Used for provenance tracking and merge conflict resolution.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `name` | VARCHAR(100) | No, Unique | e.g. "distiller_com", "upcdata4spirits" |
| `base_url` | VARCHAR(500) | Yes | |
| `priority` | INTEGER | Yes | Lower = more trusted. Used for merge conflicts |
| `scraper_class` | VARCHAR(100) | Yes | Python class name of the scraper |
| `is_enabled` | BOOLEAN | Yes | |
| `last_full_scrape` | DATETIME | Yes | |
| `last_incremental_scrape` | DATETIME | Yes | |

**Current sources and product counts**:

| Source | Priority | Products | Description |
|---|---|---|---|
| `distiller_com` | 2 | 60,770 | Largest source. Curated spirits database. Has descriptions, ratings, images, barrel info |
| `upcdata4spirits` | 10 | 4,893 | Purchased barcode data. Has UPCs, ABV, manufacturer info for American whiskeys |
| `mezcal_reviews` | 4 | 2,376 | Mezcal specialist. Tasting notes and ratings |
| `mashbill_tables` | 5 | 168 | Mash bill / grain recipe data |
| `rum_ratings` | 5 | 75 | Rum community ratings |
| `upc_lookup` | 10 | 0 | Open Food Facts enrichment (attempted, low coverage) |
| `whisky_hunter` | 6 | 0 | Auction data (scraper failed) |

---

### 3.5 `product_images`

Bottle images. 63,226 total, 63,119 downloaded locally (~4.5 GB on disk).

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `product_id` | INTEGER | No | FK → `products.id` |
| `source_url` | VARCHAR(1000) | Yes | Original image URL (mostly distiller.com imgix URLs) |
| `local_path` | VARCHAR(500) | Yes | Absolute path to downloaded image on disk |
| `is_primary` | BOOLEAN | Yes | TRUE for the main product image. 63,058 marked primary |
| `image_type` | VARCHAR(20) | Yes | All currently "bottle". Schema supports "label", "box" |
| `downloaded_at` | DATETIME | Yes | |
| `perceptual_hash` | VARCHAR(64) | Yes | For image similarity matching. Not yet populated |
| `embedding_vector` | BLOB | Yes | CLIP or similar vector embedding. Not yet populated |
| `extracted_text` | TEXT | Yes | OCR results from label. Not yet populated |
| `label_confidence` | FLOAT | Yes | Not yet populated |
| `processed_at` | DATETIME | Yes | |

**Image file location**: `data/images/unknown/` directory. Filenames match the product slug with the original file extension (`.jpg`, `.jpeg`, `.png`, `.webp`).

**Local path format**: Absolute Windows paths, e.g. `J:\Scraper\data\images\unknown\angel-s-envy-rye-finished-in-caribbean-rum-casks.jpg`

---

### 3.6 `product_upcs`

UPC barcodes for products. A single product can have multiple UPCs for different bottle sizes.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `product_id` | INTEGER | No | FK → `products.id` |
| `upc` | VARCHAR(13) | No | UPC-A barcode string, e.g. "080660001166" |
| `size_ml` | INTEGER | Yes | Bottle size: 50, 100, 200, 375, 500, 700, 750, 1000, 1750, etc. |
| `container_type` | VARCHAR(50) | Yes | See values below |
| `source` | VARCHAR(100) | Yes | e.g. "upcdata4spirits" |
| `is_canonical` | BOOLEAN | Yes | TRUE for the 750ml glass bottle entry. 6,301 canonical |
| `created_at` | DATETIME | Yes | |

**Unique constraint**: `(product_id, upc)`

**Container type values**: Glass Bottle (7,938), Plastic Bottle (401), Box (59), Carrier (37), Aluminum Can (21), Barrel (4), Ceramic Bottle (3), Plastic Container (2), Plastic Bucket (2), Metal Bottle (1)

**Size distribution**: 750ml (6,183), 375ml (574), 1750ml (425), 50ml (409), 1000ml (389), 200ml (176), 700ml (156)

**Products by UPC count**: 3,512 have 1 UPC, 745 have 2, 261 have 3, up to 89 UPCs for one product (Jack Daniel's).

---

### 3.7 `tasting_notes`

Tasting notes and ratings from various sources. 45,807 total.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `product_id` | INTEGER | No | FK → `products.id` |
| `source_id` | INTEGER | Yes | FK → `sources.id` |
| `nose` | TEXT | Yes | Aroma description. **0% populated currently** |
| `palate` | TEXT | Yes | Taste description. **0% populated currently** |
| `finish` | TEXT | Yes | Aftertaste description. **0% populated currently** |
| `overall_notes` | TEXT | Yes | General tasting notes |
| `rating_value` | FLOAT | Yes | Numeric rating. **100% of tasting notes have this** |
| `rating_scale` | VARCHAR(20) | Yes | "5" or "100" |
| `reviewer_type` | VARCHAR(20) | Yes | "community" (45,439) or "expert" (368) |

**Rating scales**:
- Scale "5": 39,212 notes (from distiller.com community ratings, range typically 1–5)
- Scale "100": 6,595 notes (from distiller.com expert ratings, range typically 0–100)

---

### 3.8 `awards`

Competition awards. Schema exists but **not yet populated** (0 rows).

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `product_id` | INTEGER | No | FK → `products.id` |
| `competition_name` | VARCHAR(300) | Yes | e.g. "San Francisco World Spirits Competition" |
| `year` | INTEGER | Yes | |
| `medal` | VARCHAR(50) | Yes | Expected: gold, silver, bronze, platinum, best_in_class, double_gold |

**Unique constraint**: `(product_id, competition_name, year, medal)`

---

### 3.9 `product_source_links`

Junction table linking products to their data sources. Contains the original raw scraped data as JSON.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `product_id` | INTEGER | No | FK → `products.id` |
| `source_id` | INTEGER | No | FK → `sources.id` |
| `source_product_id` | VARCHAR(200) | Yes | ID from the original source system |
| `source_url` | VARCHAR(1000) | Yes | URL of the product page on the source website |
| `raw_data` | TEXT | Yes | Full JSON blob of the original scraped/imported data |
| `first_seen` | DATETIME | Yes | When this product was first scraped from this source |
| `last_scraped` | DATETIME | Yes | Most recent scrape time |
| `last_changed` | DATETIME | Yes | When the raw_data last changed (content diff) |

**Unique constraint**: `(product_id, source_id)` — one link per product per source.

**Multi-source products**: 65,228 products have 1 source, 1,521 have 2 sources, 4 have 3 sources.

---

### 3.10 `distiller_source_links`

Same pattern as product_source_links but for distillers.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `distiller_id` | INTEGER | No | FK → `distillers.id` |
| `source_id` | INTEGER | No | FK → `sources.id` |
| `source_distiller_id` | VARCHAR(200) | Yes | |
| `source_url` | VARCHAR(1000) | Yes | |
| `first_seen` | DATETIME | Yes | |
| `last_scraped` | DATETIME | Yes | |

**Unique constraint**: `(distiller_id, source_id)`

---

### 3.11 `company_source_links`

Same pattern for companies.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `company_id` | INTEGER | No | FK → `companies.id` |
| `source_id` | INTEGER | No | FK → `sources.id` |
| `source_company_id` | VARCHAR(200) | Yes | |
| `source_url` | VARCHAR(1000) | Yes | |
| `first_seen` | DATETIME | Yes | |
| `last_scraped` | DATETIME | Yes | |

**Unique constraint**: `(company_id, source_id)`

---

### 3.12 `merge_conflicts`

Tracks conflicting data between sources. Schema exists but **not yet populated** (0 rows).

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `product_id` | INTEGER | No | FK → `products.id` |
| `field_name` | VARCHAR(100) | No | Which field has the conflict |
| `source_a_id` | INTEGER | No | FK → `sources.id` |
| `value_a` | TEXT | Yes | Value from source A |
| `source_b_id` | INTEGER | No | FK → `sources.id` |
| `value_b` | TEXT | Yes | Value from source B |
| `resolved` | BOOLEAN | Yes | |
| `resolved_value` | TEXT | Yes | |
| `resolved_at` | DATETIME | Yes | |
| `created_at` | DATETIME | Yes | |

---

### 3.13 `scrape_progress`

Tracks scraper execution history for crash recovery and incremental scrapes.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | INTEGER | PK | |
| `source_id` | INTEGER | No | FK → `sources.id` |
| `scrape_type` | VARCHAR(20) | No | "full" or "incremental" |
| `status` | VARCHAR(20) | No | "running", "completed", "failed", "paused" |
| `last_cursor` | TEXT | Yes | Source-specific bookmark (page number, URL, offset) |
| `items_scraped` | INTEGER | Yes | |
| `items_total` | INTEGER | Yes | |
| `started_at` | DATETIME | Yes | |
| `completed_at` | DATETIME | Yes | |
| `error_message` | TEXT | Yes | |

---

## 4. Key Relationships

### Product → Distiller (many-to-one, optional)
- `products.distiller_id` → `distillers.id`
- Only 3.9% of products have a distiller. This is the **physical production facility**.
- A distiller like "Buffalo Trace" produces many products.

### Product → Company (many-to-one, optional)
- `products.company_id` → `companies.id`
- 36.4% of products have a company. This is the **brand owner / marketing company**.
- A company like "Sazerac Company, Inc." owns many brands and products.
- Company ≠ Distiller. Example: "Angel's Envy" (company) is distilled at "Louisville Distilling Company" (distiller).

### Company → Parent Company (self-referential, optional)
- `companies.parent_company_id` → `companies.id`
- Supports corporate ownership hierarchy (e.g., subsidiary → parent conglomerate).
- Currently only 1 company has this set.

### Product → Images (one-to-many)
- One product can have multiple images, but currently all products have at most 1.
- `is_primary = TRUE` identifies the main display image.
- All images are `image_type = "bottle"` currently.

### Product → UPCs (one-to-many)
- One product can have many UPCs for different bottle sizes.
- `is_canonical = TRUE` marks the 750ml glass bottle UPC.
- The product's `upc` field also holds the canonical UPC (denormalized for convenience).

### Product → Tasting Notes (one-to-many)
- One tasting note per product per source.
- Currently only has `rating_value` data; nose/palate/finish fields exist but are empty.

### Product → Sources (many-to-many via `product_source_links`)
- A product can come from multiple sources.
- `raw_data` preserves the original scraped JSON for each source.
- Most products (97.7%) come from a single source.

---

## 5. Deduplication Logic

Products are deduplicated by `(slug, distiller_id)`:
- The `slug` is generated from the product name using `python-slugify` (lowercased, hyphens for spaces, special chars removed).
- Example: "Angel's Envy Rye" → `angel-s-envy-rye`
- Two products with the same slug can coexist if they have different `distiller_id` values (or one is NULL).

Distillers and Companies are deduplicated by `slug` alone (globally unique).

---

## 6. Spirit Type Normalization

The system normalizes spirit types from various spellings to a canonical set:

```
whiskey, whisky, bourbon, scotch, rye  →  "whiskey"
tequila                                →  "tequila"
mezcal                                 →  "mezcal"
rum                                    →  "rum"
vodka                                  →  "vodka"
gin                                    →  "gin"
brandy, cognac, armagnac               →  "brandy"
liqueur, cordial                       →  "liqueur"
absinthe, baijiu, shochu, soju, etc.   →  "other"
```

### Valid Spirit Subtypes by Type

| spirit_type | Valid subtypes |
|---|---|
| whiskey | bourbon, rye, scotch_single_malt, scotch_blended, scotch_grain, irish, japanese, canadian, tennessee, corn, wheat, single_pot_still, blended_malt, single_grain, american_single_malt, american, blended, malt, moonshine, flavored, white whiskey |
| tequila | blanco, joven, reposado, anejo, extra_anejo, cristalino, curados |
| mezcal | joven, reposado, anejo, madurado_en_vidrio, destilado_con, abocado_con, sotol, raicilla, bacanora |
| rum | white, gold, dark, aged, spiced, overproof, rhum_agricole, cachaca, navy |
| vodka | plain, flavored |
| gin | london_dry, plymouth, old_tom, genever, new_western, navy_strength |
| brandy | cognac, armagnac, calvados, pisco, grappa, fruit_brandy, other |
| liqueur | cream, herbal, fruit, nut, coffee, chocolate, other |

---

## 7. Data Quality Notes

### Well-Populated Fields
- `spirit_type`: 100% — every product has a category
- `abv`: 94.7% — nearly all products have ABV
- `proof`: 89.3% — most products have proof
- `msrp_usd`: 86.6% — most products have MSRP
- `barrel_type`: 47.4% — about half of products
- `age_statement`: 37.2% — common for aged spirits

### Sparsely Populated Fields
- `distiller_id`: 3.9% — most products lack distillery linkage
- `company_id`: 36.4% — many products lack brand owner linkage
- `description`: 24.4% — about a quarter have descriptions
- `spirit_subtype`: 11.2% — mostly whiskeys and mezcals have this
- `upc`: 7.3% — UPC data is from a single American whiskey import
- `mash_bill`: 0.2% — very rare
- All boolean flags (`is_limited_edition`, etc.): 0% TRUE — not yet populated
- `volume_ml`, `finish_type`, `batch_number`, `barrel_number`, `vintage_year`, `release_year`: 0%

### Age Statement Format
The `age_statement` field is **free text** with inconsistent formatting:
- Numeric only: "4", "12", "15" (most common)
- With unit: "12 Year", "10 Year", "8 Years"
- Descriptive: "NAS" (No Age Statement)
- Needs parsing if you want to use it as a numeric value.

### Image Data
- 63,119 of 63,226 images have been downloaded to local disk
- All local_path values are **absolute Windows paths** (e.g. `J:\Scraper\data\images\unknown\...`)
- Source URLs are mostly imgix CDN URLs from distiller.com
- The `perceptual_hash`, `embedding_vector`, `extracted_text` fields exist for future computer vision features but are all NULL

### Tasting Notes
- 45,807 tasting notes, but all data is in `rating_value` only
- The `nose`, `palate`, `finish` text fields exist but are **all NULL**
- Two rating scales: "5" (community, 39K notes) and "100" (expert, 6.6K notes)

---

## 8. Common Query Patterns

### Find a product by name (fuzzy)
```sql
SELECT id, name, spirit_type, abv, proof, msrp_usd
FROM products
WHERE name LIKE '%Buffalo Trace%'
ORDER BY name;
```

### Get full product details with relationships
```sql
SELECT
    p.*,
    d.name AS distiller_name,
    d.country AS distiller_country,
    c.name AS company_name,
    c.country AS company_country
FROM products p
LEFT JOIN distillers d ON d.id = p.distiller_id
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.id = ?;
```

### Get product with its images
```sql
SELECT p.name, pi.source_url, pi.local_path, pi.is_primary
FROM products p
JOIN product_images pi ON pi.product_id = p.id
WHERE p.id = ?
ORDER BY pi.is_primary DESC;
```

### Get all UPC barcodes for a product (all sizes)
```sql
SELECT upc, size_ml, container_type, is_canonical
FROM product_upcs
WHERE product_id = ?
ORDER BY is_canonical DESC, size_ml;
```

### Look up a product by UPC barcode
```sql
-- Check product_upcs table first (has size info)
SELECT p.id, p.name, p.spirit_type, pu.size_ml, pu.container_type
FROM product_upcs pu
JOIN products p ON p.id = pu.product_id
WHERE pu.upc = '080660001166';

-- Fallback: check products.upc field
SELECT id, name, spirit_type FROM products WHERE upc = '080660001166';
```

### Get ratings for a product
```sql
SELECT
    tn.rating_value,
    tn.rating_scale,
    tn.reviewer_type,
    s.name AS source_name
FROM tasting_notes tn
LEFT JOIN sources s ON s.id = tn.source_id
WHERE tn.product_id = ?;
```

### Browse products by spirit type with pagination
```sql
SELECT id, name, spirit_subtype, abv, proof, msrp_usd, age_statement
FROM products
WHERE spirit_type = 'whiskey'
ORDER BY name
LIMIT 50 OFFSET 0;
```

### Search products with UPC barcodes available
```sql
SELECT p.id, p.name, p.upc, p.spirit_type, p.abv
FROM products p
WHERE p.upc IS NOT NULL
ORDER BY p.name;
```

### Get source provenance for a product
```sql
SELECT s.name, s.priority, psl.source_url, psl.first_seen, psl.last_scraped
FROM product_source_links psl
JOIN sources s ON s.id = psl.source_id
WHERE psl.product_id = ?
ORDER BY s.priority;
```

### Get products with their primary image
```sql
SELECT p.id, p.name, p.spirit_type, p.abv, pi.local_path, pi.source_url
FROM products p
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
WHERE p.spirit_type = 'whiskey'
ORDER BY p.name
LIMIT 50;
```

### Stats: products by spirit type and subtype
```sql
SELECT spirit_type, spirit_subtype, COUNT(*) AS count
FROM products
GROUP BY spirit_type, spirit_subtype
ORDER BY spirit_type, count DESC;
```

---

## 9. Source Priority System

Sources have a `priority` field (lower = more trusted). When data conflicts between sources, the lower-priority source's data should be preferred.

| Priority | Source | Rationale |
|---|---|---|
| 1 | ttb_cola | US government TTB data (not yet imported) |
| 2 | distiller_com | Large curated database, expert-reviewed |
| 3 | whiskybase | Largest whisky-specific database |
| 3 | agave_matchmaker | Authoritative for tequila/mezcal |
| 4 | master_of_malt | Professional retailer |
| 4 | mezcal_reviews | Specialist database |
| 5 | rum_ratings | Community database |
| 5 | mashbill_tables | Enthusiast-curated |
| 6 | whisky_hunter | Auction data |
| 10 | upc_lookup | Open Food Facts |
| 10 | upcdata4spirits | Purchased barcode data |

---

## 10. Indexes Summary

All indexed columns for query optimization:

| Table | Index | Columns | Unique |
|---|---|---|---|
| products | `ix_products_slug` | slug | No |
| products | `ix_products_spirit_type` | spirit_type | No |
| products | `idx_product_type_name` | spirit_type, name | No |
| products | `ix_products_distiller_id` | distiller_id | No |
| products | `ix_products_company_id` | company_id | No |
| products | `ix_products_upc` | upc | No |
| products | `uq_product_slug_distiller` | slug, distiller_id | Yes |
| distillers | `ix_distillers_slug` | slug | Yes |
| companies | `ix_companies_slug` | slug | Yes |
| companies | `ix_companies_parent_company_id` | parent_company_id | No |
| product_images | `ix_product_images_product_id` | product_id | No |
| product_images | `ix_product_images_perceptual_hash` | perceptual_hash | No |
| product_upcs | `idx_product_upcs_product_id` | product_id | No |
| product_upcs | `idx_product_upcs_upc` | upc | No |
| product_upcs | `uq_product_upc` | product_id, upc | Yes |
| tasting_notes | `ix_tasting_notes_product_id` | product_id | No |
| awards | `ix_awards_product_id` | product_id | No |
| awards | `uq_award` | product_id, competition_name, year, medal | Yes |
| product_source_links | `ix_product_source_links_product_id` | product_id | No |
| product_source_links | `ix_product_source_links_source_id` | source_id | No |
| product_source_links | `uq_product_source` | product_id, source_id | Yes |
| distiller_source_links | (similar pattern) | distiller_id, source_id | Yes |
| company_source_links | (similar pattern) | company_id, source_id | Yes |
| sources | auto | name | Yes |
| merge_conflicts | `ix_merge_conflicts_product_id` | product_id | No |
| scrape_progress | `ix_scrape_progress_source_id` | source_id | No |

---

## 11. Connecting to the Database

### Direct SQLite (Python)
```python
import sqlite3
conn = sqlite3.connect("data/spirits.db")
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA foreign_keys=ON")
```

### SQLAlchemy ORM (existing project)
```python
from spirits_scraper.db.session import get_session, init_db

init_db()  # Creates tables if needed

with get_session() as session:
    products = session.query(Product).filter(
        Product.spirit_type == "whiskey"
    ).all()
```

### Read-Only Connection String
```
sqlite:///data/spirits.db
```

SQLite supports concurrent reads. WAL mode is enabled for better read concurrency. For a web app, consider read-only connections for API endpoints and a single write connection for updates.
