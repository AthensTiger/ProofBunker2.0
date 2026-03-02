# Proof Bunker 2.0 — Database Migration

Migrates the SQLite spirits database to PostgreSQL, filtering to only products that have UPC barcodes.

## Prerequisites

### 1. Install PostgreSQL (Windows)

**Option A: Official installer (recommended)**
1. Download from https://www.postgresql.org/download/windows/
2. Run the installer
3. Choose a superuser password (remember it!)
4. Default port: 5432
5. Leave everything else as default

**Option B: Via Chocolatey**
```bash
choco install postgresql
```

### 2. Create the database

Open a terminal and run:
```bash
# Connect as the postgres superuser
psql -U postgres

# Create the database
CREATE DATABASE proofbunker;

# Verify it was created
\l

# Exit
\q
```

If `psql` is not in your PATH, find it at:
`C:\Program Files\PostgreSQL\<version>\bin\psql.exe`

### 3. Configure the migration

```bash
cd migration
cp .env.example .env
```

Edit `.env` with your actual values:
```
SQLITE_PATH=J:\Scraper\data\spirits.db
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/proofbunker
IMAGE_SOURCE_DIR=J:\Scraper\data\images\unknown
```

### 4. Install dependencies

```bash
cd migration
npm install
```

## Running the Migration

### Full migration (schema + data)
```bash
npm run migrate
```

### Schema only (no data import)
```bash
npm run schema-only
```

## What Gets Migrated

| Table | Source | Filter |
|---|---|---|
| companies | SQLite `companies` | Only those referenced by qualifying products |
| distillers | SQLite `distillers` | Only those referenced by qualifying products |
| products | SQLite `products` | Only those with at least one UPC in `product_upcs` |
| product_upcs | SQLite `product_upcs` | All UPCs for qualifying products |
| product_images | SQLite `product_images` | All images for qualifying products |
| tasting_notes | SQLite `tasting_notes` | All notes for qualifying products |
| awards | SQLite `awards` | All awards for qualifying products (currently 0 rows) |

### What does NOT get migrated
- Source provenance tables (`sources`, `*_source_links`)
- Scrape progress tracking (`scrape_progress`, `merge_conflicts`)
- Products without UPC barcodes (~62,000 products excluded)
- Companies/distillers not referenced by qualifying products

## After Migration

1. **Upload images to Cloudflare R2**
   - The `product_images.storage_key` column is pre-populated with keys like `products/slug.jpg`
   - Local images are at the path specified in `IMAGE_SOURCE_DIR`
   - After uploading, update `product_images.cdn_url` with the public R2 URLs

2. **Configure the backend**
   - Copy the `DATABASE_URL` to your backend `.env` file

3. **Verify the data**
   ```bash
   psql -U postgres -d proofbunker

   -- Check counts
   SELECT 'products' AS tbl, COUNT(*) FROM products
   UNION ALL SELECT 'companies', COUNT(*) FROM companies
   UNION ALL SELECT 'distillers', COUNT(*) FROM distillers
   UNION ALL SELECT 'product_upcs', COUNT(*) FROM product_upcs
   UNION ALL SELECT 'product_images', COUNT(*) FROM product_images
   UNION ALL SELECT 'tasting_notes', COUNT(*) FROM tasting_notes;

   -- Check a product with its UPCs
   SELECT p.name, p.spirit_type, p.proof, pu.upc, pu.size_ml
   FROM products p
   JOIN product_upcs pu ON pu.product_id = p.id
   WHERE p.name LIKE '%Buffalo Trace%';
   ```

## Resetting and Re-running

If you need to start over:
```sql
-- Connect to PostgreSQL
psql -U postgres -d proofbunker

-- Drop everything and recreate the public schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q
```

Then run `npm run migrate` again.

## Troubleshooting

**"SQLite database not found"**
- Check that `SQLITE_PATH` in `.env` points to the correct file

**"Target database already has tables"**
- The migration requires an empty database. Reset it using the instructions above.

**"Connection refused"**
- Make sure PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check your password in `DATABASE_URL`

**"better-sqlite3 install fails"**
- Requires Python and Visual Studio Build Tools on Windows
- Install: `npm install --global windows-build-tools` (run as admin)
- Or: Install Python 3 and Visual Studio Build Tools separately
