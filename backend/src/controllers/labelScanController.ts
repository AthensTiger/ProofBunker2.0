import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { ANTHROPIC_API_KEY, ANTHROPIC_API_URL } from '../config/research';

// Rate limit: 10 scans per user per minute
const rateLimitMap = new Map<number, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(userId, recent);
    return false;
  }
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

/**
 * POST /api/v1/products/scan-label
 * Accepts a base64-encoded label image, sends to Claude Vision,
 * returns structured product data extracted from the label.
 */
export async function scanLabel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { image, media_type } = req.body;

    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'image (base64) is required' });
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const mtype = media_type || 'image/jpeg';
    if (!validTypes.includes(mtype)) {
      res.status(400).json({ error: `Unsupported media type. Use: ${validTypes.join(', ')}` });
      return;
    }

    if (!ANTHROPIC_API_KEY) {
      res.status(503).json({ error: 'Label scanning is not configured. API key is missing.' });
      return;
    }

    const userId = req.user!.id;
    if (!checkRateLimit(userId)) {
      res.status(429).json({ error: 'Too many scan requests. Please wait a minute.' });
      return;
    }

    const systemPrompt = `You are a spirits bottle label reader. You will be shown a photo of a bottle label. Extract all visible product information from the label text and return ONLY valid JSON.

The JSON must match this schema:
{
  "name": "string - the full official product name as printed on the label",
  "spirit_type": "string or null - one of: whiskey, tequila, rum, gin, vodka, cognac, brandy, mezcal, liqueur, other",
  "spirit_subtype": "string or null - e.g. 'bourbon', 'rye', 'single malt', 'reposado', 'blanco'",
  "company_name": "string or null - the brand or producer name on the label",
  "distiller_name": "string or null - the distillery name if printed on the label (may differ from company)",
  "proof": "number or null - proof if printed on label",
  "abv": "number or null - ABV as decimal fraction (e.g. 0.45 for 45%)",
  "age_statement": "string or null - e.g. '12 Years', 'Aged 10 Years'",
  "description": "string or null - any descriptive text from the label",
  "mash_bill": "string or null - grain recipe if listed",
  "barrel_type": "string or null - barrel/cask info if listed",
  "finish_type": "string or null - cask finish if listed",
  "volume_ml": "number or null - bottle volume in ml if visible",
  "batch_number": "string or null - batch/lot number if visible",
  "barrel_number": "string or null - barrel/cask number if visible",
  "confidence": "number 0-1 - how confident you are in the extracted data",
  "notes": "string - brief note about what you could and couldn't read"
}

Rules:
- ONLY extract what is VISIBLE on the label. Do not guess or supplement with external knowledge.
- The product name should be exactly as printed, preserving capitalization and formatting.
- If you can see proof OR ABV, calculate the other (proof = ABV * 200, ABV = proof / 200).
- Set fields to null if not visible on the label.
- confidence should reflect label readability and how much data you could extract.
- If the image is not a bottle label, set confidence to 0 and explain in notes.`;

    const anthropicBody = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mtype,
              data: image,
            },
          },
          {
            type: 'text',
            text: 'Read this bottle label and extract all product information you can see.',
          },
        ],
      }],
      system: systemPrompt,
    });

    const anthropicHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };

    let anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: anthropicHeaders,
      body: anthropicBody,
    });

    // Single retry on transient overload
    if (anthropicRes.status === 529) {
      await new Promise((r) => setTimeout(r, 2000));
      anthropicRes = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: anthropicHeaders,
        body: anthropicBody,
      });
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic Vision API error:', anthropicRes.status, errText);
      const userMsg = anthropicRes.status === 529
        ? 'Label scanning service is temporarily busy. Please try again.'
        : 'Label scanning failed. Please try again.';
      res.status(502).json({ error: userMsg });
      return;
    }

    const anthropicData = await anthropicRes.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const textBlock = anthropicData.content?.find((c) => c.type === 'text');
    if (!textBlock) {
      res.status(502).json({ error: 'AI returned no response.' });
      return;
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse label scan response:', jsonStr);
      res.status(502).json({ error: 'AI returned invalid data. Please try again.' });
      return;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/products/:id/label-verified
 * Mark a product as label-verified after a user confirms scanned data.
 */
export async function markLabelVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = parseInt(req.params.id as string, 10);
    if (isNaN(productId)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const result = await pool.query(
      `UPDATE products
       SET label_verified = TRUE,
           label_verified_at = COALESCE(label_verified_at, NOW()),
           label_verification_count = label_verification_count + 1
       WHERE id = $1
       RETURNING id, label_verified, label_verification_count`,
      [productId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/products/:id/label-status
 * Check if a product has been label-verified.
 */
export async function getLabelStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = parseInt(req.params.id as string, 10);
    if (isNaN(productId)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const result = await pool.query(
      `SELECT id, label_verified, label_verified_at, label_verification_count
       FROM products WHERE id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
