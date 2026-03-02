#!/usr/bin/env node
// ================================================================
// Proof Bunker 2.0 — Upload Product Images to Cloudflare R2
// ================================================================
// Reads product_images from PostgreSQL, finds the matching local
// files, uploads them to R2, and updates cdn_url in the database.
//
// Usage:
//   node upload-images.js              # Upload all pending images
//   node upload-images.js --dry-run    # Preview what would be uploaded
//   node upload-images.js --test 5     # Upload only the first 5 images
// ================================================================

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ── Configuration ──────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const IMAGE_SOURCE_DIR = process.env.IMAGE_SOURCE_DIR || 'J:\\Scraper\\data\\images';
const R2_BUCKET = process.env.R2_BUCKET || 'proofbunker';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const DRY_RUN = process.argv.includes('--dry-run');
const TEST_LIMIT = process.argv.includes('--test')
  ? parseInt(process.argv[process.argv.indexOf('--test') + 1]) || 5
  : 0;
const CONCURRENCY = 10; // Parallel uploads

// ── S3 Client (R2-compatible) ──────────────────────────────────

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ── Helpers ────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

/**
 * Get the MIME type from a file extension.
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Recursively build a map of filename → full local path.
 * This lets us find images across subdirectories quickly.
 */
function buildFileIndex(dir) {
  const index = new Map(); // filename → full path
  let fileCount = 0;

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      return; // Skip unreadable directories
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        // Store by filename (lowercase for case-insensitive matching)
        const key = entry.name.toLowerCase();
        if (!index.has(key)) {
          index.set(key, fullPath);
        }
        fileCount++;
      }
    }
  }

  log(`Scanning ${dir} for image files...`);
  walk(dir);
  log(`  Indexed ${fileCount.toLocaleString()} files across ${index.size.toLocaleString()} unique filenames`);
  return index;
}

/**
 * Upload a single file to R2 and return the CDN URL.
 */
async function uploadToR2(localPath, storageKey) {
  const fileContent = fs.readFileSync(localPath);
  const contentType = getMimeType(localPath);

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    })
  );

  return `${R2_PUBLIC_URL}/${storageKey}`;
}

/**
 * Process a batch of images concurrently.
 */
async function processBatch(batch, fileIndex, client, stats) {
  const promises = batch.map(async (row) => {
    const filename = path.basename(row.storage_key).toLowerCase();
    const localPath = fileIndex.get(filename);

    if (!localPath) {
      stats.notFound++;
      return;
    }

    if (!fs.existsSync(localPath)) {
      stats.notFound++;
      return;
    }

    if (DRY_RUN) {
      stats.wouldUpload++;
      if (stats.wouldUpload <= 10) {
        log(`  [dry-run] Would upload: ${localPath} → ${row.storage_key}`);
      }
      return;
    }

    try {
      const cdnUrl = await uploadToR2(localPath, row.storage_key);
      await client.query(
        'UPDATE product_images SET cdn_url = $1 WHERE id = $2',
        [cdnUrl, row.id]
      );
      stats.uploaded++;
    } catch (err) {
      stats.failed++;
      if (stats.failed <= 10) {
        log(`  ERROR uploading ${row.storage_key}: ${err.message}`);
      }
    }
  });

  await Promise.all(promises);
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  log('=== Proof Bunker 2.0 — Image Upload to R2 ===');

  if (DRY_RUN) log('DRY RUN MODE — no files will be uploaded');
  if (TEST_LIMIT) log(`TEST MODE — only processing ${TEST_LIMIT} images`);

  // Validate config
  if (!R2_PUBLIC_URL) {
    console.error('ERROR: R2_PUBLIC_URL not set in .env');
    process.exit(1);
  }

  // Build file index from local image directory
  const fileIndex = buildFileIndex(IMAGE_SOURCE_DIR);

  // Connect to PostgreSQL
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    // Get images that need uploading (have storage_key but no cdn_url)
    let query = `
      SELECT id, product_id, storage_key, source_url
      FROM product_images
      WHERE storage_key IS NOT NULL AND cdn_url IS NULL
      ORDER BY id
    `;
    if (TEST_LIMIT) {
      query += ` LIMIT ${TEST_LIMIT}`;
    }

    const result = await client.query(query);
    const images = result.rows;

    log(`Found ${images.length.toLocaleString()} images to upload`);

    if (images.length === 0) {
      log('Nothing to do — all images already have cdn_url set.');
      return;
    }

    // Process in batches
    const stats = { uploaded: 0, notFound: 0, failed: 0, wouldUpload: 0 };
    const totalBatches = Math.ceil(images.length / CONCURRENCY);

    for (let i = 0; i < images.length; i += CONCURRENCY) {
      const batch = images.slice(i, i + CONCURRENCY);
      await processBatch(batch, fileIndex, client, stats);

      // Progress update every 100 images
      const processed = Math.min(i + CONCURRENCY, images.length);
      if (processed % 100 === 0 || processed === images.length) {
        log(`  Progress: ${processed}/${images.length} processed`);
      }
    }

    // Summary
    log('');
    log('=== Upload Complete ===');
    if (DRY_RUN) {
      log(`  Would upload: ${stats.wouldUpload.toLocaleString()}`);
      log(`  Not found locally: ${stats.notFound.toLocaleString()}`);
    } else {
      log(`  Uploaded: ${stats.uploaded.toLocaleString()}`);
      log(`  Not found locally: ${stats.notFound.toLocaleString()}`);
      log(`  Failed: ${stats.failed.toLocaleString()}`);
    }

    // Final DB check
    const countResult = await client.query(
      'SELECT COUNT(*) AS total, COUNT(cdn_url) AS with_cdn FROM product_images'
    );
    const { total, with_cdn } = countResult.rows[0];
    log(`  Database: ${with_cdn}/${total} images have cdn_url set`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
