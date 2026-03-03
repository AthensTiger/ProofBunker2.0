import { Request, Response, NextFunction } from 'express';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import pool from '../config/database';
import r2Client, { R2_BUCKET, R2_PUBLIC_URL } from '../config/r2';

// ── Bunker Items (product-level) ──────────────────────

export async function getBunkerList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { spirit_type, location_id, status, sort_by, sort_dir } = req.query;

    let having = '';
    const conditions = ['bi.user_id = $1', `(p.approval_status = 'approved' OR p.submitted_by_user_id = $1)`];
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (spirit_type) {
      conditions.push(`p.spirit_type = $${paramIndex}`);
      params.push(spirit_type as string);
      paramIndex++;
    }

    if (location_id) {
      conditions.push(`bb.storage_location_id = $${paramIndex}`);
      params.push(parseInt(location_id as string));
      paramIndex++;
    }

    if (status) {
      const statuses = (status as string).split(',').filter(s => ['sealed', 'opened', 'empty'].includes(s));
      if (statuses.length === 1) {
        conditions.push(`bb.status = $${paramIndex}`);
        params.push(statuses[0]);
        paramIndex++;
      } else if (statuses.length > 1) {
        conditions.push(`bb.status = ANY($${paramIndex}::text[])`);
        params.push(statuses as any);
        paramIndex++;
      }
    }

    const where = conditions.join(' AND ');

    const allowedSorts: Record<string, string> = {
      name: 'p.name',
      spirit_type: 'p.spirit_type',
      proof: 'p.proof',
      rating: 'bi.personal_rating',
      created_at: 'bi.created_at',
    };
    const orderCol = allowedSorts[sort_by as string] || 'p.name';
    const orderDir = sort_dir === 'desc' ? 'DESC' : 'ASC';

    const result = await pool.query(
      `SELECT bi.id, bi.product_id, bi.personal_rating, bi.notes, bi.created_at,
              p.name, p.slug, p.spirit_type, p.spirit_subtype, p.abv, p.proof,
              p.age_statement, p.approval_status,
              c.name AS company_name,
              COALESCE(pi.cdn_url, (
                SELECT bp.cdn_url FROM bunker_bottles bb2
                JOIN bunker_bottle_photos bp ON bp.bunker_bottle_id = bb2.id
                WHERE bb2.bunker_item_id = bi.id
                ORDER BY bp.display_order ASC, bp.id ASC LIMIT 1
              )) AS image_url,
              COUNT(bb.id)::int AS bottle_count,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT usl.name), NULL) AS location_names,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT bb.status), NULL) AS statuses,
              (SELECT bb2.id FROM bunker_bottles bb2
               WHERE bb2.bunker_item_id = bi.id
               ORDER BY CASE bb2.status WHEN 'sealed' THEN 1 WHEN 'opened' THEN 2 WHEN 'empty' THEN 3 END, bb2.id LIMIT 1) AS primary_bottle_id,
              (SELECT bb2.status FROM bunker_bottles bb2
               WHERE bb2.bunker_item_id = bi.id
               ORDER BY CASE bb2.status WHEN 'sealed' THEN 1 WHEN 'opened' THEN 2 WHEN 'empty' THEN 3 END, bb2.id LIMIT 1) AS primary_status
       FROM bunker_items bi
       JOIN products p ON p.id = bi.product_id
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       LEFT JOIN bunker_bottles bb ON bb.bunker_item_id = bi.id
       LEFT JOIN user_storage_locations usl ON usl.id = bb.storage_location_id
       WHERE ${where}
       GROUP BY bi.id, p.id, c.name, pi.cdn_url
       ORDER BY ${orderCol} ${orderDir} NULLS LAST`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getBunkerItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const itemResult = await pool.query(
      `SELECT
              -- bunker_item own columns
              bi.id, bi.user_id, bi.product_id, bi.personal_rating, bi.notes,
              bi.created_at, bi.updated_at,
              -- override-only fields (no product counterpart)
              bi.batch_number, bi.barrel_number, bi.year_distilled,
              -- override fields with product counterparts (raw override values)
              bi.release_year  AS override_release_year,
              bi.proof         AS override_proof,
              bi.abv           AS override_abv,
              bi.age_statement AS override_age_statement,
              bi.mash_bill     AS override_mash_bill,
              -- product fields (raw, for display and admin context)
              p.name, p.slug, p.spirit_type, p.spirit_subtype,
              p.proof          AS product_proof,
              p.abv            AS product_abv,
              p.age_statement  AS product_age_statement,
              p.mash_bill      AS product_mash_bill,
              p.release_year   AS product_release_year,
              p.batch_number   AS product_batch_number,
              p.barrel_number  AS product_barrel_number,
              p.volume_ml, p.msrp_usd,
              p.barrel_type, p.barrel_char_level, p.finish_type,
              p.is_limited_edition, p.is_discontinued, p.approval_status,
              p.description,
              -- effective (resolved) values — COALESCE override over product
              COALESCE(bi.proof,         p.proof)         AS proof,
              COALESCE(bi.abv,           p.abv)           AS abv,
              COALESCE(bi.age_statement, p.age_statement) AS age_statement,
              COALESCE(bi.mash_bill,     p.mash_bill)     AS mash_bill,
              COALESCE(bi.release_year,  p.release_year)  AS release_year,
              -- joins
              c.name AS company_name,
              d.name AS distiller_name,
              COALESCE(pi.cdn_url, (
                SELECT bp.cdn_url FROM bunker_bottles bb2
                JOIN bunker_bottle_photos bp ON bp.bunker_bottle_id = bb2.id
                WHERE bb2.bunker_item_id = bi.id
                ORDER BY bp.display_order ASC, bp.id ASC LIMIT 1
              )) AS image_url
       FROM bunker_items bi
       JOIN products p ON p.id = bi.product_id
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN distillers d ON d.id = p.distiller_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       WHERE bi.id = $1 AND bi.user_id = $2`,
      [id, userId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({ error: 'Bunker item not found' });
      return;
    }

    // Fetch bottles with photos + COALESCE detail values from product
    const bottlesResult = await pool.query(
      `SELECT
              bb.id, bb.bunker_item_id, bb.storage_location_id, bb.status,
              bb.purchase_price, bb.created_at, bb.updated_at,
              -- raw bottle-level values (null = not set)
              bb.batch_number, bb.barrel_number, bb.year_distilled,
              bb.proof         AS override_proof,
              bb.abv           AS override_abv,
              bb.age_statement AS override_age_statement,
              bb.mash_bill     AS override_mash_bill,
              bb.release_year  AS override_release_year,
              -- effective values (COALESCE bottle ?? product)
              COALESCE(bb.proof,         p.proof)         AS proof,
              COALESCE(bb.abv,           p.abv)           AS abv,
              COALESCE(bb.age_statement, p.age_statement) AS age_statement,
              COALESCE(bb.mash_bill,     p.mash_bill)     AS mash_bill,
              COALESCE(bb.release_year,  p.release_year)  AS release_year,
              usl.name AS location_name,
              COALESCE(
                json_agg(
                  json_build_object('id', bp.id, 'cdn_url', bp.cdn_url, 'display_order', bp.display_order)
                ) FILTER (WHERE bp.id IS NOT NULL),
                '[]'
              ) AS photos
       FROM bunker_bottles bb
       JOIN bunker_items bi ON bi.id = bb.bunker_item_id
       JOIN products p ON p.id = bi.product_id
       LEFT JOIN user_storage_locations usl ON usl.id = bb.storage_location_id
       LEFT JOIN bunker_bottle_photos bp ON bp.bunker_bottle_id = bb.id
       WHERE bb.bunker_item_id = $1
       GROUP BY bb.id, p.proof, p.abv, p.age_statement, p.mash_bill, p.release_year, usl.name
       ORDER BY bb.created_at DESC`,
      [id]
    );

    // Fetch tasting notes
    const tastingResult = await pool.query(
      `SELECT id, source_name, nose, palate, finish, overall_notes, rating_value, rating_scale
       FROM tasting_notes WHERE product_id = $1 ORDER BY source_name`,
      [itemResult.rows[0].product_id]
    );

    res.json({
      ...itemResult.rows[0],
      bottles: bottlesResult.rows,
      tasting_notes: tastingResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function addToBunker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { product_id, storage_location_id, status, purchase_price } = req.body;

    if (!product_id) {
      res.status(400).json({ error: 'product_id is required' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert bunker_item (get or create)
      const itemResult = await client.query(
        `INSERT INTO bunker_items (user_id, product_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, product_id) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [userId, product_id]
      );
      const bunkerItemId = itemResult.rows[0].id;

      // Extract per-bottle detail fields
      const BOTTLE_DETAIL_FIELDS: { key: string; numeric?: boolean }[] = [
        { key: 'batch_number' },
        { key: 'barrel_number' },
        { key: 'year_distilled', numeric: true },
        { key: 'release_year',   numeric: true },
        { key: 'proof',          numeric: true },
        { key: 'abv',            numeric: true },
        { key: 'age_statement' },
        { key: 'mash_bill' },
      ];
      const detailValues: (string | number | null)[] = BOTTLE_DETAIL_FIELDS.map((f) => {
        const raw = req.body[f.key];
        if (raw === undefined || raw === null || raw === '') return null;
        if (f.numeric) { const n = Number(raw); return isNaN(n) ? null : n; }
        return String(raw).trim() || null;
      });

      // Create a bottle with all detail fields
      const bottleResult = await client.query(
        `INSERT INTO bunker_bottles
           (bunker_item_id, storage_location_id, status, purchase_price,
            batch_number, barrel_number, year_distilled, release_year,
            proof, abv, age_statement, mash_bill)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [bunkerItemId, storage_location_id || null, status || 'sealed', purchase_price || null,
         ...detailValues]
      );

      await client.query('COMMIT');

      res.status(201).json({
        bunker_item_id: bunkerItemId,
        bottle: bottleResult.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === '23503') {
      res.status(400).json({ error: 'Invalid product_id or storage_location_id' });
      return;
    }
    next(err);
  }
}

export async function updateBunkerItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if ('personal_rating' in req.body) {
      updates.push(`personal_rating = $${idx++}`);
      values.push(req.body.personal_rating ?? null);
    }
    if ('notes' in req.body) {
      updates.push(`notes = $${idx++}`);
      values.push(req.body.notes ?? null);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id, userId);
    const result = await pool.query(
      `UPDATE bunker_items
       SET ${updates.join(', ')}
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bunker item not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function removeBunkerItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM bunker_items WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bunker item not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── Bottles (physical bottle-level) ───────────────────

export async function updateBottle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { bottleId } = req.params;

    const BOTTLE_FIELDS: { key: string; col: string; numeric?: boolean }[] = [
      { key: 'storage_location_id', col: 'storage_location_id', numeric: true },
      { key: 'status',              col: 'status' },
      { key: 'purchase_price',      col: 'purchase_price',      numeric: true },
      { key: 'batch_number',        col: 'batch_number' },
      { key: 'barrel_number',       col: 'barrel_number' },
      { key: 'year_distilled',      col: 'year_distilled',      numeric: true },
      { key: 'release_year',        col: 'release_year',        numeric: true },
      { key: 'proof',               col: 'proof',               numeric: true },
      { key: 'abv',                 col: 'abv',                 numeric: true },
      { key: 'age_statement',       col: 'age_statement' },
      { key: 'mash_bill',           col: 'mash_bill' },
    ];

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const field of BOTTLE_FIELDS) {
      if (field.key in req.body) {
        const raw = req.body[field.key];
        let val: unknown;
        if (raw === null || raw === '' || raw === undefined) {
          val = null;
        } else if (field.numeric) {
          const n = Number(raw);
          val = isNaN(n) ? null : n;
        } else {
          val = String(raw).trim() || null;
        }
        updates.push(`${field.col} = $${idx++}`);
        values.push(val);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(bottleId, userId);
    const result = await pool.query(
      `UPDATE bunker_bottles bb
       SET ${updates.join(', ')}
       FROM bunker_items bi
       WHERE bb.id = $${idx++}
         AND bb.bunker_item_id = bi.id
         AND bi.user_id = $${idx}
       RETURNING bb.*`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bottle not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteBottle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { bottleId } = req.params;

    const result = await pool.query(
      `DELETE FROM bunker_bottles bb
       USING bunker_items bi
       WHERE bb.id = $1
         AND bb.bunker_item_id = bi.id
         AND bi.user_id = $2
       RETURNING bb.bunker_item_id`,
      [bottleId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bottle not found' });
      return;
    }

    // If no bottles remain, remove the bunker item too
    const remaining = await pool.query(
      'SELECT COUNT(*)::int AS count FROM bunker_bottles WHERE bunker_item_id = $1',
      [result.rows[0].bunker_item_id]
    );

    if (remaining.rows[0].count === 0) {
      await pool.query('DELETE FROM bunker_items WHERE id = $1', [result.rows[0].bunker_item_id]);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── Bottle Photos ─────────────────────────────────────

export async function uploadBottlePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { bottleId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    // Verify bottle belongs to user
    const bottleCheck = await pool.query(
      `SELECT bb.id FROM bunker_bottles bb
       JOIN bunker_items bi ON bi.id = bb.bunker_item_id
       WHERE bb.id = $1 AND bi.user_id = $2`,
      [bottleId, userId]
    );

    if (bottleCheck.rows.length === 0) {
      res.status(404).json({ error: 'Bottle not found' });
      return;
    }

    // Check photo count limit
    const photoCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM bunker_bottle_photos WHERE bunker_bottle_id = $1',
      [bottleId]
    );

    if (photoCount.rows[0].count >= 5) {
      res.status(400).json({ error: 'Maximum 5 photos per bottle' });
      return;
    }

    // Upload to R2
    const ext = file.originalname.split('.').pop() || 'jpg';
    const storageKey = `bottles/${userId}/${bottleId}/${Date.now()}.${ext}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    }));

    const cdnUrl = `${R2_PUBLIC_URL}/${storageKey}`;

    const result = await pool.query(
      `INSERT INTO bunker_bottle_photos (bunker_bottle_id, storage_key, cdn_url, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [bottleId, storageKey, cdnUrl, photoCount.rows[0].count]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function uploadBottlePhotoFromUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { bottleId } = req.params;
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    // Verify bottle belongs to user
    const bottleCheck = await pool.query(
      `SELECT bb.id FROM bunker_bottles bb
       JOIN bunker_items bi ON bi.id = bb.bunker_item_id
       WHERE bb.id = $1 AND bi.user_id = $2`,
      [bottleId, userId]
    );

    if (bottleCheck.rows.length === 0) {
      res.status(404).json({ error: 'Bottle not found' });
      return;
    }

    // Check photo count limit
    const photoCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM bunker_bottle_photos WHERE bunker_bottle_id = $1',
      [bottleId]
    );

    if (photoCount.rows[0].count >= 5) {
      res.status(400).json({ error: 'Maximum 5 photos per bottle' });
      return;
    }

    // Fetch image from URL
    const response = await fetch(url);
    if (!response.ok) {
      res.status(400).json({ error: 'Failed to fetch image from URL' });
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      res.status(400).json({ error: 'URL does not point to an image' });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const storageKey = `bottles/${userId}/${bottleId}/${Date.now()}.${ext}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    }));

    const cdnUrl = `${R2_PUBLIC_URL}/${storageKey}`;

    const result = await pool.query(
      `INSERT INTO bunker_bottle_photos (bunker_bottle_id, storage_key, cdn_url, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [bottleId, storageKey, cdnUrl, photoCount.rows[0].count]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteBottlePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { photoId } = req.params;

    // Find photo and verify ownership
    const photoResult = await pool.query(
      `SELECT bp.id, bp.storage_key
       FROM bunker_bottle_photos bp
       JOIN bunker_bottles bb ON bb.id = bp.bunker_bottle_id
       JOIN bunker_items bi ON bi.id = bb.bunker_item_id
       WHERE bp.id = $1 AND bi.user_id = $2`,
      [photoId, userId]
    );

    if (photoResult.rows.length === 0) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    // Delete from R2
    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: photoResult.rows[0].storage_key,
    }));

    // Delete from DB
    await pool.query('DELETE FROM bunker_bottle_photos WHERE id = $1', [photoId]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
