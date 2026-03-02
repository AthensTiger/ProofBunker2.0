#!/usr/bin/env node
// ================================================================
// Proof Bunker 2.0 — SQLite to PostgreSQL Migration
// ================================================================
// Migrates ONLY products with UPC barcodes, plus their related
// companies, distillers, images, tasting notes, and awards.
//
// Usage:
//   npm run migrate          # Full migration (schema + data)
//   npm run schema-only      # Create schema without importing data
//
// Prerequisites:
//   1. PostgreSQL running with an empty database created
//   2. .env file configured (copy from .env.example)
//   3. npm install
// ================================================================

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ── Configuration ──────────────────────────────────────────────

const SQLITE_PATH = process.env.SQLITE_PATH || 'J:\\Scraper\\data\\spirits.db';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/proofbunker';
const IMAGE_SOURCE_DIR = process.env.IMAGE_SOURCE_DIR || 'J:\\Scraper\\data\\images\\unknown';
const SCHEMA_ONLY = process.argv.includes('--schema-only');
const BATCH_SIZE = 500;

// ── Helpers ────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function logCount(table, count) {
  log(`  ${table}: ${count.toLocaleString()} rows migrated`);
}

/**
 * Build a multi-row INSERT statement with parameterized values.
 * Returns { text, values } for pg client.query().
 */
function buildBatchInsert(table, columns, rows) {
  const colList = columns.join(', ');
  const valueClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const row of rows) {
    const placeholders = columns.map(() => `$${paramIndex++}`);
    valueClauses.push(`(${placeholders.join(', ')})`);
    for (const col of columns) {
      values.push(row[col] !== undefined ? row[col] : null);
    }
  }

  return {
    text: `INSERT INTO ${table} (${colList}) VALUES ${valueClauses.join(', ')}`,
    values,
  };
}

/**
 * Insert rows in batches. Returns total count inserted.
 */
async function batchInsert(client, table, columns, rows) {
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const query = buildBatchInsert(table, columns, batch);
    await client.query(query);
    total += batch.length;
  }
  return total;
}

/**
 * Convert SQLite boolean (0/1/null) to PostgreSQL boolean.
 */
function toBool(val) {
  if (val === null || val === undefined) return false;
  return val === 1 || val === true;
}

/**
 * Convert SQLite datetime string to ISO timestamp for PostgreSQL.
 */
function toTimestamp(val) {
  if (!val) return null;
  // SQLite stores as "2024-01-15 12:30:00" or ISO format
  return new Date(val).toISOString();
}

/**
 * Derive a storage key for cloud storage from the local image path.
 * e.g., "J:\Scraper\data\images\unknown\slug.jpg" → "products/slug.jpg"
 */
function deriveStorageKey(localPath) {
  if (!localPath) return null;
  const filename = path.basename(localPath);
  return `products/${filename}`;
}

// ── Schema Creation ────────────────────────────────────────────

async function createSchema(client) {
  log('Creating PostgreSQL schema...');

  const docDir = path.join(__dirname, '..', 'Documentation');
  const referenceSchema = fs.readFileSync(
    path.join(docDir, 'schema-reference-data.sql'),
    'utf-8'
  );
  const userSchema = fs.readFileSync(
    path.join(docDir, 'schema-user-data.sql'),
    'utf-8'
  );

  // Run reference schema first (companies, distillers, products, etc.)
  await client.query(referenceSchema);
  log('  Reference data schema created');

  // Run user schema (users, bunker, sharing, etc.)
  await client.query(userSchema);
  log('  User data schema created');
}

// ── Data Extraction from SQLite ────────────────────────────────

function getQualifyingProductIds(sqlite) {
  const rows = sqlite
    .prepare('SELECT DISTINCT product_id FROM product_upcs')
    .all();
  return rows.map((r) => r.product_id);
}

function getRelatedEntityIds(sqlite, productIds) {
  if (productIds.length === 0) return { companyIds: [], distillerIds: [] };

  const placeholders = productIds.map(() => '?').join(',');

  const companies = sqlite
    .prepare(
      `SELECT DISTINCT company_id FROM products
       WHERE id IN (${placeholders}) AND company_id IS NOT NULL`
    )
    .all(...productIds);

  const distillers = sqlite
    .prepare(
      `SELECT DISTINCT distiller_id FROM products
       WHERE id IN (${placeholders}) AND distiller_id IS NOT NULL`
    )
    .all(...productIds);

  const companyIds = companies.map((r) => r.company_id);
  const distillerIds = distillers.map((r) => r.distiller_id);

  // Also include parent companies of qualifying companies
  if (companyIds.length > 0) {
    const parentPlaceholders = companyIds.map(() => '?').join(',');
    const parents = sqlite
      .prepare(
        `SELECT DISTINCT parent_company_id FROM companies
         WHERE id IN (${parentPlaceholders}) AND parent_company_id IS NOT NULL`
      )
      .all(...companyIds);

    for (const p of parents) {
      if (!companyIds.includes(p.parent_company_id)) {
        companyIds.push(p.parent_company_id);
      }
    }
  }

  return { companyIds, distillerIds };
}

function getSourceNameMap(sqlite) {
  const rows = sqlite.prepare('SELECT id, name FROM sources').all();
  const map = {};
  for (const r of rows) {
    map[r.id] = r.name;
  }
  return map;
}

// ── Migration Functions ────────────────────────────────────────

async function migrateCompanies(sqlite, client, companyIds) {
  if (companyIds.length === 0) {
    logCount('companies', 0);
    return;
  }

  const placeholders = companyIds.map(() => '?').join(',');
  const rows = sqlite
    .prepare(`SELECT * FROM companies WHERE id IN (${placeholders})`)
    .all(...companyIds);

  // Only include parent_company_id if the parent is in our set
  const companyIdSet = new Set(companyIds);
  const mapped = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    website: r.website || null,
    parent_company_id:
      r.parent_company_id && companyIdSet.has(r.parent_company_id)
        ? r.parent_company_id
        : null,
    country: r.country || null,
    description: r.description || null,
    created_at: toTimestamp(r.created_at) || new Date().toISOString(),
    updated_at: toTimestamp(r.updated_at) || new Date().toISOString(),
  }));

  // Insert companies without parent_company_id first to avoid FK issues,
  // then update parent references
  const columns = [
    'id', 'name', 'slug', 'website', 'country',
    'description', 'created_at', 'updated_at',
  ];
  const withoutParent = mapped.map((r) => ({ ...r }));
  const count = await batchInsert(client, 'companies', columns, withoutParent);

  // Now update parent_company_id for those that have one
  const withParent = mapped.filter((r) => r.parent_company_id !== null);
  for (const r of withParent) {
    await client.query(
      'UPDATE companies SET parent_company_id = $1 WHERE id = $2',
      [r.parent_company_id, r.id]
    );
  }

  logCount('companies', count);
}

async function migrateDistillers(sqlite, client, distillerIds) {
  if (distillerIds.length === 0) {
    logCount('distillers', 0);
    return;
  }

  const placeholders = distillerIds.map(() => '?').join(',');
  const rows = sqlite
    .prepare(`SELECT * FROM distillers WHERE id IN (${placeholders})`)
    .all(...distillerIds);

  const mapped = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    country: r.country || null,
    region: r.region || null,
    city: r.city || null,
    address: r.address || null,
    latitude: r.latitude || null,
    longitude: r.longitude || null,
    website: r.website || null,
    founded_year: r.founded_year || null,
    status: r.status || 'active',
    description: r.description || null,
    created_at: toTimestamp(r.created_at) || new Date().toISOString(),
    updated_at: toTimestamp(r.updated_at) || new Date().toISOString(),
  }));

  const columns = [
    'id', 'name', 'slug', 'country', 'region', 'city', 'address',
    'latitude', 'longitude', 'website', 'founded_year', 'status',
    'description', 'created_at', 'updated_at',
  ];

  const count = await batchInsert(client, 'distillers', columns, mapped);
  logCount('distillers', count);
}

async function migrateProducts(sqlite, client, productIds) {
  if (productIds.length === 0) {
    logCount('products', 0);
    return;
  }

  const placeholders = productIds.map(() => '?').join(',');
  const rows = sqlite
    .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
    .all(...productIds);

  const mapped = rows.map((r) => ({
    id: r.id,
    distiller_id: r.distiller_id || null,
    company_id: r.company_id || null,
    name: r.name,
    slug: r.slug,
    upc: r.upc || null,
    spirit_type: r.spirit_type,
    spirit_subtype: r.spirit_subtype || null,
    abv: r.abv || null,
    proof: r.proof || null,
    age_statement: r.age_statement || null,
    volume_ml: r.volume_ml || null,
    mash_bill: r.mash_bill || null,
    barrel_type: r.barrel_type || null,
    barrel_char_level: r.barrel_char_level || null,
    finish_type: r.finish_type || null,
    distillation_method: r.distillation_method || null,
    batch_number: r.batch_number || null,
    barrel_number: r.barrel_number || null,
    vintage_year: r.vintage_year || null,
    release_year: r.release_year || null,
    is_limited_edition: toBool(r.is_limited_edition),
    is_discontinued: toBool(r.is_discontinued),
    is_single_cask: toBool(r.is_single_cask),
    cask_strength: toBool(r.cask_strength),
    msrp_usd: r.msrp_usd || null,
    description: r.description || null,
    approval_status: 'approved',
    submitted_by_user_id: null,
    created_at: toTimestamp(r.created_at) || new Date().toISOString(),
    updated_at: toTimestamp(r.updated_at) || new Date().toISOString(),
  }));

  const columns = [
    'id', 'distiller_id', 'company_id', 'name', 'slug', 'upc',
    'spirit_type', 'spirit_subtype', 'abv', 'proof', 'age_statement',
    'volume_ml', 'mash_bill', 'barrel_type', 'barrel_char_level',
    'finish_type', 'distillation_method', 'batch_number', 'barrel_number',
    'vintage_year', 'release_year', 'is_limited_edition', 'is_discontinued',
    'is_single_cask', 'cask_strength', 'msrp_usd', 'description',
    'approval_status', 'submitted_by_user_id', 'created_at', 'updated_at',
  ];

  const count = await batchInsert(client, 'products', columns, mapped);
  logCount('products', count);
}

async function migrateProductUpcs(sqlite, client, productIds) {
  if (productIds.length === 0) {
    logCount('product_upcs', 0);
    return;
  }

  const placeholders = productIds.map(() => '?').join(',');
  const rows = sqlite
    .prepare(
      `SELECT * FROM product_upcs WHERE product_id IN (${placeholders})`
    )
    .all(...productIds);

  const mapped = rows.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    upc: r.upc,
    size_ml: r.size_ml || null,
    container_type: r.container_type || null,
    source: r.source || null,
    is_canonical: toBool(r.is_canonical),
    created_at: toTimestamp(r.created_at) || new Date().toISOString(),
  }));

  const columns = [
    'id', 'product_id', 'upc', 'size_ml', 'container_type',
    'source', 'is_canonical', 'created_at',
  ];

  const count = await batchInsert(client, 'product_upcs', columns, mapped);
  logCount('product_upcs', count);
}

async function migrateProductImages(sqlite, client, productIds) {
  if (productIds.length === 0) {
    logCount('product_images', 0);
    return;
  }

  const placeholders = productIds.map(() => '?').join(',');
  const rows = sqlite
    .prepare(
      `SELECT * FROM product_images WHERE product_id IN (${placeholders})`
    )
    .all(...productIds);

  const mapped = rows.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    source_url: r.source_url || null,
    storage_key: deriveStorageKey(r.local_path),
    cdn_url: null, // Populated after R2 upload
    is_primary: toBool(r.is_primary),
    image_type: r.image_type || 'bottle',
    perceptual_hash: r.perceptual_hash || null,
    embedding_vector: null, // BYTEA — skip blob migration
    extracted_text: r.extracted_text || null,
    label_confidence: r.label_confidence || null,
    downloaded_at: toTimestamp(r.downloaded_at),
    processed_at: toTimestamp(r.processed_at),
    created_at: new Date().toISOString(),
  }));

  const columns = [
    'id', 'product_id', 'source_url', 'storage_key', 'cdn_url',
    'is_primary', 'image_type', 'perceptual_hash', 'embedding_vector',
    'extracted_text', 'label_confidence', 'downloaded_at', 'processed_at',
    'created_at',
  ];

  const count = await batchInsert(client, 'product_images', columns, mapped);
  logCount('product_images', count);
}

async function migrateTastingNotes(sqlite, client, productIds) {
  if (productIds.length === 0) {
    logCount('tasting_notes', 0);
    return;
  }

  // Build source name lookup from SQLite sources table
  const sourceNameMap = getSourceNameMap(sqlite);

  const placeholders = productIds.map(() => '?').join(',');
  const rows = sqlite
    .prepare(
      `SELECT * FROM tasting_notes WHERE product_id IN (${placeholders})`
    )
    .all(...productIds);

  const mapped = rows.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    source_name: r.source_id ? (sourceNameMap[r.source_id] || null) : null,
    nose: r.nose || null,
    palate: r.palate || null,
    finish: r.finish || null,
    overall_notes: r.overall_notes || null,
    rating_value: r.rating_value || null,
    rating_scale: r.rating_scale || null,
    reviewer_type: r.reviewer_type || null,
    created_at: new Date().toISOString(),
  }));

  const columns = [
    'id', 'product_id', 'source_name', 'nose', 'palate', 'finish',
    'overall_notes', 'rating_value', 'rating_scale', 'reviewer_type',
    'created_at',
  ];

  const count = await batchInsert(client, 'tasting_notes', columns, mapped);
  logCount('tasting_notes', count);
}

async function migrateAwards(sqlite, client, productIds) {
  if (productIds.length === 0) {
    logCount('awards', 0);
    return;
  }

  const placeholders = productIds.map(() => '?').join(',');
  const rows = sqlite
    .prepare(
      `SELECT * FROM awards WHERE product_id IN (${placeholders})`
    )
    .all(...productIds);

  if (rows.length === 0) {
    logCount('awards', 0);
    return;
  }

  const mapped = rows.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    competition_name: r.competition_name || null,
    year: r.year || null,
    medal: r.medal || null,
    created_at: new Date().toISOString(),
  }));

  const columns = [
    'id', 'product_id', 'competition_name', 'year', 'medal', 'created_at',
  ];

  const count = await batchInsert(client, 'awards', columns, mapped);
  logCount('awards', count);
}

// ── Sequence Reset ─────────────────────────────────────────────

async function resetSequences(client) {
  log('Resetting PostgreSQL sequences...');

  const tables = [
    'companies',
    'distillers',
    'products',
    'product_images',
    'product_upcs',
    'tasting_notes',
    'awards',
    'users',
    'user_storage_locations',
    'bunker_items',
    'bunker_bottles',
    'bunker_bottle_photos',
    'menu_templates',
    'menu_template_items',
    'bunker_shares',
  ];

  for (const table of tables) {
    try {
      const result = await client.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_val FROM ${table}`
      );
      const nextVal = result.rows[0].next_val;
      await client.query(
        `ALTER SEQUENCE ${table}_id_seq RESTART WITH ${nextVal}`
      );
    } catch (err) {
      // Table might not exist or be empty — safe to skip
    }
  }

  log('  Sequences reset');
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  log('=== Proof Bunker 2.0 Migration ===');
  log(`Source: ${SQLITE_PATH}`);
  log(`Target: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`); // Hide password

  // Verify SQLite file exists
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`ERROR: SQLite database not found at ${SQLITE_PATH}`);
    console.error('Update SQLITE_PATH in your .env file.');
    process.exit(1);
  }

  // Open SQLite (read-only)
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Connect to PostgreSQL
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    // Check if tables already exist
    const existing = await client.query(
      `SELECT COUNT(*) FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'products'`
    );
    if (parseInt(existing.rows[0].count) > 0) {
      console.error('ERROR: Target database already has tables.');
      console.error('Drop all tables first or use a fresh database.');
      console.error('  To reset: DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      process.exit(1);
    }

    // Step 1: Create schema
    await createSchema(client);

    if (SCHEMA_ONLY) {
      log('Schema created successfully (--schema-only mode, no data imported).');
      return;
    }

    // Step 2: Identify qualifying products (those with UPCs)
    log('Identifying products with UPC barcodes...');
    const productIds = getQualifyingProductIds(sqlite);
    log(`  Found ${productIds.length.toLocaleString()} qualifying products`);

    // Step 3: Identify related companies and distillers
    const { companyIds, distillerIds } = getRelatedEntityIds(sqlite, productIds);
    log(`  ${companyIds.length.toLocaleString()} companies, ${distillerIds.length.toLocaleString()} distillers`);

    // Step 4: Migrate data in FK order within a transaction
    log('Migrating data...');
    await client.query('BEGIN');

    await migrateCompanies(sqlite, client, companyIds);
    await migrateDistillers(sqlite, client, distillerIds);
    await migrateProducts(sqlite, client, productIds);
    await migrateProductUpcs(sqlite, client, productIds);
    await migrateProductImages(sqlite, client, productIds);
    await migrateTastingNotes(sqlite, client, productIds);
    await migrateAwards(sqlite, client, productIds);

    // Step 5: Reset sequences
    await resetSequences(client);

    await client.query('COMMIT');
    log('');
    log('=== Migration completed successfully! ===');

    // Print summary
    log('');
    log('Summary:');
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM companies'),
      client.query('SELECT COUNT(*) FROM distillers'),
      client.query('SELECT COUNT(*) FROM products'),
      client.query('SELECT COUNT(*) FROM product_upcs'),
      client.query('SELECT COUNT(*) FROM product_images'),
      client.query('SELECT COUNT(*) FROM tasting_notes'),
      client.query('SELECT COUNT(*) FROM awards'),
    ]);
    const labels = [
      'companies', 'distillers', 'products', 'product_upcs',
      'product_images', 'tasting_notes', 'awards',
    ];
    for (let i = 0; i < labels.length; i++) {
      log(`  ${labels[i]}: ${parseInt(counts[i].rows[0].count).toLocaleString()}`);
    }

    log('');
    log('Next steps:');
    log('  1. Upload images to Cloudflare R2 (storage_key is pre-populated)');
    log('  2. Update product_images.cdn_url after R2 upload');
    log('  3. Configure backend .env with DATABASE_URL');

  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // Ignore rollback errors
    }
    console.error('');
    console.error('Migration FAILED:', err.message);
    console.error('');
    console.error('Full error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

main();
