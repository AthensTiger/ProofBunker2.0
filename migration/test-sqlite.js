#!/usr/bin/env node
// Quick test: verify SQLite connection and preview migration scope.

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const SQLITE_PATH = process.env.SQLITE_PATH || 'J:\\Scraper\\data\\spirits.db';

console.log(`Opening SQLite database: ${SQLITE_PATH}`);

try {
  const db = new Database(SQLITE_PATH, { readonly: true });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('Connected successfully!\n');

  // Table counts
  console.log('=== Full Database Counts ===');
  const tables = [
    'products', 'distillers', 'companies', 'sources',
    'product_images', 'product_upcs', 'tasting_notes', 'awards',
    'product_source_links', 'distiller_source_links', 'company_source_links',
  ];
  for (const t of tables) {
    try {
      const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ${t}`).get();
      console.log(`  ${t}: ${row.cnt.toLocaleString()}`);
    } catch (e) {
      console.log(`  ${t}: (table not found)`);
    }
  }

  // Qualifying products (those with UPCs)
  console.log('\n=== Migration Scope (UPC-filtered) ===');

  const qualifyingProducts = db
    .prepare('SELECT DISTINCT product_id FROM product_upcs')
    .all();
  const productIds = qualifyingProducts.map((r) => r.product_id);
  console.log(`  Qualifying products: ${productIds.length.toLocaleString()}`);

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => '?').join(',');

    // Companies
    const companies = db
      .prepare(
        `SELECT DISTINCT company_id FROM products
         WHERE id IN (${placeholders}) AND company_id IS NOT NULL`
      )
      .all(...productIds);
    console.log(`  Related companies: ${companies.length.toLocaleString()}`);

    // Distillers
    const distillers = db
      .prepare(
        `SELECT DISTINCT distiller_id FROM products
         WHERE id IN (${placeholders}) AND distiller_id IS NOT NULL`
      )
      .all(...productIds);
    console.log(`  Related distillers: ${distillers.length.toLocaleString()}`);

    // Images
    const images = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM product_images
         WHERE product_id IN (${placeholders})`
      )
      .get(...productIds);
    console.log(`  Related images: ${images.cnt.toLocaleString()}`);

    // UPCs
    const upcs = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM product_upcs
         WHERE product_id IN (${placeholders})`
      )
      .get(...productIds);
    console.log(`  Related UPCs: ${upcs.cnt.toLocaleString()}`);

    // Tasting notes
    const notes = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM tasting_notes
         WHERE product_id IN (${placeholders})`
      )
      .get(...productIds);
    console.log(`  Related tasting notes: ${notes.cnt.toLocaleString()}`);

    // Awards
    try {
      const awards = db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM awards
           WHERE product_id IN (${placeholders})`
        )
        .get(...productIds);
      console.log(`  Related awards: ${awards.cnt.toLocaleString()}`);
    } catch (e) {
      console.log(`  Related awards: 0 (table empty or missing)`);
    }

    // Spirit type breakdown of qualifying products
    console.log('\n=== Qualifying Products by Spirit Type ===');
    const byType = db
      .prepare(
        `SELECT spirit_type, COUNT(*) AS cnt FROM products
         WHERE id IN (${placeholders})
         GROUP BY spirit_type ORDER BY cnt DESC`
      )
      .all(...productIds);
    for (const r of byType) {
      console.log(`  ${r.spirit_type}: ${r.cnt.toLocaleString()}`);
    }

    // Sample qualifying products
    console.log('\n=== Sample Qualifying Products (first 10) ===');
    const samples = db
      .prepare(
        `SELECT p.name, p.spirit_type, p.proof, p.upc,
                c.name AS company_name
         FROM products p
         LEFT JOIN companies c ON c.id = p.company_id
         WHERE p.id IN (${placeholders})
         ORDER BY p.name
         LIMIT 10`
      )
      .all(...productIds);
    for (const s of samples) {
      console.log(
        `  ${s.name} | ${s.spirit_type} | ${s.proof || 'N/A'} proof | UPC: ${s.upc || 'in product_upcs'} | ${s.company_name || 'no company'}`
      );
    }

    // Source name map (for tasting notes denormalization)
    console.log('\n=== Sources (for tasting notes denormalization) ===');
    const sources = db.prepare('SELECT id, name, priority FROM sources ORDER BY priority').all();
    for (const s of sources) {
      console.log(`  ID ${s.id}: ${s.name} (priority ${s.priority})`);
    }

    // Check images with local paths
    console.log('\n=== Image Local Paths (sample) ===');
    const imgSamples = db
      .prepare(
        `SELECT pi.local_path, pi.source_url, pi.is_primary
         FROM product_images pi
         WHERE pi.product_id IN (${placeholders})
         AND pi.local_path IS NOT NULL
         LIMIT 5`
      )
      .all(...productIds);
    for (const img of imgSamples) {
      console.log(`  ${img.local_path}`);
      console.log(`    → storage_key: products/${path.basename(img.local_path)}`);
    }
  }

  db.close();
  console.log('\nSQLite test complete.');
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
