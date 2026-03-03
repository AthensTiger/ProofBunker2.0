import { Request, Response, NextFunction } from 'express';
import {
  BRAVE_SEARCH_API_KEY,
  ANTHROPIC_API_KEY,
  BRAVE_SEARCH_URL,
  ANTHROPIC_API_URL,
} from '../config/research';

// In-memory per-user rate limiter: userId -> timestamps
const rateLimitMap = new Map<number, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

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

export async function researchProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    if (!BRAVE_SEARCH_API_KEY || !ANTHROPIC_API_KEY) {
      res.status(503).json({ error: 'Research feature is not configured. API keys are missing.' });
      return;
    }

    const userId = req.user!.id;
    if (!checkRateLimit(userId)) {
      res.status(429).json({ error: 'Too many research requests. Please wait a minute before trying again.' });
      return;
    }

    // 1. Search via Brave
    const searchQuery = `${query.trim()} whiskey spirits bottle`;
    const braveUrl = `${BRAVE_SEARCH_URL}?q=${encodeURIComponent(searchQuery)}&count=5`;

    const braveRes = await fetch(braveUrl, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
      },
    });

    if (!braveRes.ok) {
      const errText = await braveRes.text();
      console.error('Brave Search API error:', braveRes.status, errText);
      res.status(502).json({ error: 'Search failed. Please try again later.' });
      return;
    }

    const braveData = await braveRes.json() as {
      web?: { results?: Array<{ title: string; description: string; url: string }> };
    };

    const searchResults = braveData.web?.results || [];
    if (searchResults.length === 0) {
      res.json({
        confidence: 0,
        sources: [],
      });
      return;
    }

    // Build search results text for Claude
    const searchText = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}\nURL: ${r.url}`)
      .join('\n\n');

    const sourceUrls = searchResults.map((r) => r.url);

    // 2. Extract structured data via Claude
    const systemPrompt = `You are a spirits/whiskey product data extraction assistant. Given web search results about a spirit product, extract structured product information. Return ONLY valid JSON with no additional text.

The JSON must match this schema:
{
  "name": "string or null - official product name",
  "spirit_type": "string or null - one of: whiskey, bourbon, scotch, rye, tequila, rum, gin, vodka, cognac, brandy, mezcal",
  "spirit_subtype": "string or null - e.g. 'Kentucky Straight Bourbon', 'Single Malt', 'Reposado'",
  "company_name": "string or null - parent/brand company name",
  "distiller_name": "string or null - actual distillery name",
  "proof": "number or null",
  "abv": "number or null - as percentage like 45.0",
  "age_statement": "string or null - e.g. '12 Years', 'NAS'",
  "description": "string or null - brief product description",
  "mash_bill": "string or null - e.g. '75% corn, 13% rye, 12% malted barley'",
  "barrel_type": "string or null - e.g. 'New charred American oak'",
  "finish_type": "string or null - e.g. 'Port cask finish'",
  "msrp_usd": "number or null - retail price in USD",
  "volume_ml": "number or null - standard bottle size in ml",
  "country_of_origin": "string or null",
  "region": "string or null - e.g. 'Kentucky', 'Speyside'",
  "upc": "string or null - UPC/EAN barcode number if found",
  "image_urls": "array of strings - URLs to product/bottle images found in results",
  "confidence": "number 0-1 - how confident you are in the extracted data"
}

Rules:
- Only include fields you are reasonably confident about from the search results
- Set fields to null if not found or uncertain
- For proof/abv: if you have one, calculate the other (proof = abv * 2)
- confidence should reflect how much data was found and how reliable it appears
- image_urls should only include direct image URLs that appear to be product photos`;

    const userPrompt = `Extract product data for: "${query.trim()}"

Search results:
${searchText}`;

    const anthropicBody = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const anthropicHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };

    let anthropicRes = await fetch(ANTHROPIC_API_URL, { method: 'POST', headers: anthropicHeaders, body: anthropicBody });

    // Single retry on transient overload (529)
    if (anthropicRes.status === 529) {
      await new Promise((r) => setTimeout(r, 2000));
      anthropicRes = await fetch(ANTHROPIC_API_URL, { method: 'POST', headers: anthropicHeaders, body: anthropicBody });
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errText);
      const userMsg = anthropicRes.status === 529
        ? 'Research service is temporarily busy. Please try again in a moment.'
        : 'AI extraction failed. Please try again later.';
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

    // Parse the JSON from Claude's response (handle potential markdown wrapping)
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response as JSON:', jsonStr);
      res.status(502).json({ error: 'AI returned invalid data. Please try again.' });
      return;
    }

    // Attach sources
    result.sources = sourceUrls;

    res.json(result);
  } catch (err) {
    next(err);
  }
}
