/**
 * AI-Powered Product Data Cleanup Script
 *
 * Iterates through existing products, researches each via Brave Search + Claude,
 * and writes proposed corrections to the product_corrections staging table.
 * The live products table is NEVER modified by this script.
 *
 * Usage:
 *   cd backend && npx ts-node src/scripts/cleanupProducts.ts
 *   cd backend && npx ts-node src/scripts/cleanupProducts.ts --resume    # Resume from last position
 *   cd backend && npx ts-node src/scripts/cleanupProducts.ts --limit 50  # Process only 50 products
 *   cd backend && npx ts-node src/scripts/cleanupProducts.ts --id 123    # Process single product
 */

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const BATCH_SIZE = 10; // Products per batch query
const DELAY_BETWEEN_PRODUCTS_MS = 2000; // Rate limit: 2s between AI calls
const MAX_RETRIES = 2;

interface ProductRow {
  id: number;
  name: string;
  spirit_type: string;
  spirit_subtype: string | null;
  proof: number | null;
  abv: number | null;
  age_statement: string | null;
  mash_bill: string | null;
  barrel_type: string | null;
  description: string | null;
  msrp_usd: number | null;
  company_name: string | null;
  distiller_name: string | null;
  producer_name: string | null;
  parent_company: string | null;
  upc: string | null;
}

interface AICorrection {
  name: string | null;
  spirit_type: string | null;
  spirit_subtype: string | null;
  company_name: string | null;
  distiller_name: string | null;
  producer_name: string | null;
  parent_company: string | null;
  proof: number | null;
  abv: number | null;
  age_statement: string | null;
  mash_bill: string | null;
  barrel_type: string | null;
  description: string | null;
  msrp_usd: number | null;
  confidence: number;
  notes: string | null;
}

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: { resume: boolean; limit: number | null; id: number | null } = {
    resume: false,
    limit: null,
    id: null,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--resume') opts.resume = true;
    if (args[i] === '--limit' && args[i + 1]) opts.limit = parseInt(args[i + 1]);
    if (args[i] === '--id' && args[i + 1]) opts.id = parseInt(args[i + 1]);
  }
  return opts;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function braveSearch(query: string): Promise<Array<{ title: string; description: string; url: string }>> {
  const url = `${BRAVE_SEARCH_URL}?q=${encodeURIComponent(query)}&count=8`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Brave Search error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as {
    web?: { results?: Array<{ title: string; description: string; url: string }> };
  };

  return data.web?.results || [];
}

async function aiExtract(product: ProductRow, upcResults: Array<{ title: string; description: string; url: string }>, nameResults: Array<{ title: string; description: string; url: string }>): Promise<AICorrection> {
  const formatResults = (results: Array<{ title: string; description: string; url: string }>) =>
    results.map((r, i) => `[${i + 1}] ${r.title}\n${r.description}\nURL: ${r.url}`).join('\n\n');

  const upcSection = upcResults.length > 0
    ? `\n\nUPC BARCODE SEARCH RESULTS (search for "${product.upc}"):\n${formatResults(upcResults)}`
    : '\n\nUPC BARCODE SEARCH: No results found for this UPC.';

  const nameSection = `\n\nPRODUCT NAME SEARCH RESULTS:\n${formatResults(nameResults)}`;

  const systemPrompt = `You are a spirits product data verification assistant. You are given a product record from our database along with TWO sets of search results:

1. UPC BARCODE SEARCH — results from searching the product's UPC barcode number. This is the most reliable way to identify the EXACT product (specific variant, size, expression). If UPC results clearly identify a specific product, that identification takes priority.

2. PRODUCT NAME SEARCH — results from searching the product name + brand. These provide additional detail but may return info about different variants of the same brand.

YOUR VERIFICATION PROCESS:
Step 1: Use the UPC search results to confirm the EXACT product identity (which specific variant/expression this barcode belongs to).
Step 2: Use the name search results to fill in additional details (proof, mash bill, distillery, etc.) — but ONLY for the specific product identified by the UPC.
Step 3: If the UPC results and name results point to DIFFERENT products/variants, trust the UPC identification and lower your confidence score.
Step 4: If the UPC search returns no useful results, rely on the name search but note this in your explanation and lower confidence.

IMPORTANT RULES:
- The bottle label is the ultimate source of truth. Prioritize data from the producer/brand's official website.
- The product name should be the EXACT name as printed on the bottle label (e.g., "Buffalo Trace Kentucky Straight Bourbon Whiskey", not "BUFFALO TRACE BOURBON 750ML").
- Producer = the brand name on the front of the bottle (e.g., "Barrell Craft Spirits", "Maker's Mark", "Pursuit United"). This is the brand that makes/bottles the product.
- Distiller = the physical facility where the spirit was distilled. Often different from producer for NDPs (Non-Distiller Producers). If undisclosed, use "Undisclosed (State)" format, e.g., "Undisclosed (Indiana)".
- Company = the brand/company name traditionally associated with this product line — may be the same as producer.
- Parent Company = the ultimate corporate parent entity that owns the brand (e.g., "Beam Suntory" owns Maker's Mark, "Sazerac Company" owns Buffalo Trace, "Campari Group" owns Wild Turkey). Only include if clearly identified.
- Do NOT guess. If you cannot verify a field from authoritative sources, set it to null.
- ABV should be a decimal fraction (0.45 = 45%). Proof = ABV * 2.
- In your notes, explicitly state whether the UPC confirmed the product identity, and flag any discrepancies between UPC and name search results.

Return ONLY valid JSON matching this schema:
{
  "name": "string or null - exact label name",
  "spirit_type": "string or null - one of: whiskey, tequila, mezcal, rum, vodka, gin, brandy, liqueur, other",
  "spirit_subtype": "string or null - e.g. 'bourbon', 'rye', 'single malt', 'reposado'",
  "company_name": "string or null - brand/company name",
  "distiller_name": "string or null - actual distillery or 'Undisclosed (State)'",
  "producer_name": "string or null - brand name on the bottle front (the producer/bottler)",
  "parent_company": "string or null - ultimate corporate parent (e.g. 'Beam Suntory', 'Sazerac Company')",
  "proof": "number or null",
  "abv": "number or null - decimal fraction",
  "age_statement": "string or null - e.g. '12 Years', 'NAS'",
  "mash_bill": "string or null",
  "barrel_type": "string or null",
  "description": "string or null - brief factual description",
  "msrp_usd": "number or null",
  "confidence": "number 0-1 - overall confidence in the corrections",
  "notes": "string - brief explanation: did UPC confirm the product? what changed and why? cite sources"
}`;

  const currentData = `CURRENT DATABASE RECORD:
- Name: ${product.name}
- Spirit Type: ${product.spirit_type}
- Spirit Subtype: ${product.spirit_subtype || 'N/A'}
- Company: ${product.company_name || 'N/A'}
- Distiller: ${product.distiller_name || 'N/A'}
- Producer: ${product.producer_name || 'N/A'}
- Parent Company: ${product.parent_company || 'N/A'}
- Proof: ${product.proof || 'N/A'}
- ABV: ${product.abv || 'N/A'}
- Age Statement: ${product.age_statement || 'N/A'}
- Mash Bill: ${product.mash_bill || 'N/A'}
- Barrel Type: ${product.barrel_type || 'N/A'}
- Description: ${product.description || 'N/A'}
- MSRP: ${product.msrp_usd || 'N/A'}
- UPC: ${product.upc || 'N/A'}`;

  const userPrompt = `Verify and correct this product record. Use the UPC search to confirm product identity first, then use name search for details.

${currentData}
${upcSection}
${nameSection}`;

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  };

  let res = await fetch(ANTHROPIC_API_URL, { method: 'POST', headers, body });

  // Retry on 529 (overloaded)
  if (res.status === 529) {
    await sleep(3000);
    res = await fetch(ANTHROPIC_API_URL, { method: 'POST', headers, body });
  }

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const textBlock = data.content?.find((c) => c.type === 'text');
  if (!textBlock) {
    throw new Error('AI returned no text response');
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  return JSON.parse(jsonStr);
}

async function processProduct(pool: Pool, product: ProductRow): Promise<boolean> {
  // Skip if correction already exists for this product
  const existing = await pool.query(
    'SELECT id FROM product_corrections WHERE product_id = $1 AND status = $2',
    [product.id, 'pending']
  );
  if (existing.rows.length > 0) {
    log(`  Skipping product ${product.id} — pending correction already exists`);
    return false;
  }

  // Step 1: UPC-specific search (most reliable for product identity)
  let upcResults: Array<{ title: string; description: string; url: string }> = [];
  if (product.upc) {
    upcResults = await braveSearch(`"${product.upc}" spirit whiskey bourbon`);
    await sleep(1000); // Rate limit between searches
  }

  // Step 2: Name + brand search (for additional details)
  const nameTerms = [product.name];
  if (product.company_name) nameTerms.push(product.company_name);
  nameTerms.push('spirits bottle official');
  const nameResults = await braveSearch(nameTerms.join(' '));

  if (upcResults.length === 0 && nameResults.length === 0) {
    log(`  No search results for product ${product.id}: "${product.name}"`);
    return false;
  }

  // AI extraction with both result sets for cross-reference
  const correction = await aiExtract(product, upcResults, nameResults);

  // Check if anything actually changed
  const hasChanges =
    (correction.name && correction.name !== product.name) ||
    (correction.company_name && correction.company_name !== product.company_name) ||
    (correction.distiller_name && correction.distiller_name !== product.distiller_name) ||
    (correction.producer_name && correction.producer_name !== product.producer_name) ||
    (correction.parent_company && correction.parent_company !== product.parent_company) ||
    (correction.proof !== null && correction.proof !== product.proof) ||
    (correction.abv !== null && correction.abv !== product.abv) ||
    (correction.age_statement && correction.age_statement !== product.age_statement) ||
    (correction.spirit_type && correction.spirit_type !== product.spirit_type) ||
    (correction.spirit_subtype && correction.spirit_subtype !== product.spirit_subtype) ||
    (correction.mash_bill && correction.mash_bill !== product.mash_bill) ||
    (correction.barrel_type && correction.barrel_type !== product.barrel_type) ||
    (correction.description && correction.description !== product.description) ||
    (correction.msrp_usd !== null && correction.msrp_usd !== product.msrp_usd);

  if (!hasChanges) {
    log(`  Product ${product.id} "${product.name}" — no changes needed`);
    return false;
  }

  const sourceUrls = [...new Set([...upcResults.map((r) => r.url), ...nameResults.map((r) => r.url)])];

  // Insert correction into staging table
  await pool.query(
    `INSERT INTO product_corrections (
       product_id,
       current_name, current_company_name, current_distiller_name,
       current_producer_name, current_parent_company,
       current_proof, current_abv, current_age_statement,
       current_spirit_type, current_spirit_subtype,
       current_mash_bill, current_barrel_type, current_description, current_msrp_usd,
       proposed_name, proposed_company_name, proposed_distiller_name,
       proposed_producer_name, proposed_parent_company,
       proposed_proof, proposed_abv, proposed_age_statement,
       proposed_spirit_type, proposed_spirit_subtype,
       proposed_mash_bill, proposed_barrel_type, proposed_description, proposed_msrp_usd,
       confidence, sources, ai_notes
     ) VALUES (
       $1,
       $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
       $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
       $30, $31, $32
     )`,
    [
      product.id,
      product.name, product.company_name, product.distiller_name,
      product.producer_name, product.parent_company,
      product.proof, product.abv, product.age_statement,
      product.spirit_type, product.spirit_subtype,
      product.mash_bill, product.barrel_type, product.description, product.msrp_usd,
      correction.name, correction.company_name, correction.distiller_name,
      correction.producer_name, correction.parent_company,
      correction.proof, correction.abv, correction.age_statement,
      correction.spirit_type, correction.spirit_subtype,
      correction.mash_bill, correction.barrel_type, correction.description, correction.msrp_usd,
      correction.confidence, sourceUrls, correction.notes,
    ]
  );

  log(`  Product ${product.id} "${product.name}" — correction staged (confidence: ${(correction.confidence * 100).toFixed(0)}%)`);
  return true;
}

async function main() {
  if (!BRAVE_SEARCH_API_KEY || !ANTHROPIC_API_KEY) {
    console.error('ERROR: BRAVE_SEARCH_API_KEY and ANTHROPIC_API_KEY must be set in .env');
    process.exit(1);
  }

  const opts = parseArgs();
  const pool = new Pool({ connectionString: DATABASE_URL });

  log('=== Product Data Cleanup Script ===');

  try {
    // Ensure staging tables exist
    const tableCheck = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'product_corrections'`
    );
    if (tableCheck.rows.length === 0) {
      console.error('ERROR: product_corrections table does not exist. Run schema-patches.sql first.');
      process.exit(1);
    }

    // Get or create progress record
    let progress = await pool.query('SELECT * FROM cleanup_progress ORDER BY id DESC LIMIT 1');
    if (progress.rows.length === 0) {
      await pool.query(
        `INSERT INTO cleanup_progress (last_product_id, products_total, products_done, status)
         VALUES (0, 0, 0, 'idle')`
      );
      progress = await pool.query('SELECT * FROM cleanup_progress ORDER BY id DESC LIMIT 1');
    }
    const progressId = progress.rows[0].id;

    // Single product mode
    if (opts.id) {
      const productResult = await pool.query(
        `SELECT p.*, c.name AS company_name, d.name AS distiller_name,
                (SELECT upc FROM product_upcs WHERE product_id = p.id AND is_canonical = true LIMIT 1) AS upc
         FROM products p
         LEFT JOIN companies c ON c.id = p.company_id
         LEFT JOIN distillers d ON d.id = p.distiller_id
         WHERE p.id = $1`,
        [opts.id]
      );
      if (productResult.rows.length === 0) {
        console.error(`Product ${opts.id} not found`);
        process.exit(1);
      }
      log(`Processing single product: ${opts.id}`);
      await processProduct(pool, productResult.rows[0]);
      log('Done.');
      return;
    }

    // Determine starting point
    let startId = 0;
    if (opts.resume && progress.rows[0].last_product_id > 0) {
      startId = progress.rows[0].last_product_id;
      log(`Resuming from product ID ${startId}`);
    }

    // Count total products
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM products WHERE approval_status = 'approved' AND id > $1`,
      [startId]
    );
    const total = countResult.rows[0].total;
    log(`Products to process: ${total}`);

    const limit = opts.limit || total;

    // Update progress
    await pool.query(
      `UPDATE cleanup_progress SET status = 'running', products_total = $1, started_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [total, progressId]
    );

    let processed = 0;
    let corrected = 0;
    let errors = 0;
    let lastId = startId;

    while (processed < limit) {
      // Fetch next batch
      const batch = await pool.query(
        `SELECT p.*, c.name AS company_name, d.name AS distiller_name,
                (SELECT upc FROM product_upcs WHERE product_id = p.id AND is_canonical = true LIMIT 1) AS upc
         FROM products p
         LEFT JOIN companies c ON c.id = p.company_id
         LEFT JOIN distillers d ON d.id = p.distiller_id
         WHERE p.approval_status = 'approved' AND p.id > $1
         ORDER BY p.id ASC
         LIMIT $2`,
        [lastId, Math.min(BATCH_SIZE, limit - processed)]
      );

      if (batch.rows.length === 0) break;

      for (const product of batch.rows) {
        try {
          const changed = await processProduct(pool, product);
          if (changed) corrected++;
          processed++;
          lastId = product.id;

          // Update progress
          await pool.query(
            `UPDATE cleanup_progress SET last_product_id = $1, products_done = $2, updated_at = NOW() WHERE id = $3`,
            [lastId, processed, progressId]
          );

          // Rate limit
          if (processed < limit) {
            await sleep(DELAY_BETWEEN_PRODUCTS_MS);
          }
        } catch (err) {
          errors++;
          log(`  ERROR on product ${product.id} "${product.name}": ${(err as Error).message}`);

          // Update progress with error but continue
          await pool.query(
            `UPDATE cleanup_progress SET error_message = $1, updated_at = NOW() WHERE id = $2`,
            [`Last error on product ${product.id}: ${(err as Error).message}`, progressId]
          );

          // Back off on errors
          await sleep(5000);
        }
      }

      log(`Progress: ${processed}/${limit} processed, ${corrected} corrections, ${errors} errors`);
    }

    // Mark complete
    const finalStatus = processed >= total ? 'completed' : 'paused';
    await pool.query(
      `UPDATE cleanup_progress SET status = $1, products_done = $2, updated_at = NOW() WHERE id = $3`,
      [finalStatus, processed, progressId]
    );

    log('');
    log('=== Cleanup Complete ===');
    log(`  Processed: ${processed}`);
    log(`  Corrections staged: ${corrected}`);
    log(`  Errors: ${errors}`);
    log(`  Status: ${finalStatus}`);
    log('');
    log('Next: Review corrections in the admin panel or query product_corrections table.');

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
