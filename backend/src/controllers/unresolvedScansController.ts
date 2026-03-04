import { Request, Response, NextFunction } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import pool from '../config/database';
import r2Client, { R2_BUCKET, R2_PUBLIC_URL } from '../config/r2';

// GET /bunker/unresolved/count
export async function getUnresolvedCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM unresolved_bottle_scans WHERE user_id = $1',
      [userId]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    next(err);
  }
}

// GET /bunker/unresolved
export async function getUnresolvedScans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      `SELECT
         s.id, s.upc, s.storage_location_id, s.notes, s.created_at,
         usl.name AS location_name,
         COALESCE(
           json_agg(json_build_object('id', sp.id, 'cdn_url', sp.cdn_url, 'display_order', sp.display_order)
             ORDER BY sp.display_order)
           FILTER (WHERE sp.id IS NOT NULL),
           '[]'
         ) AS photos
       FROM unresolved_bottle_scans s
       LEFT JOIN user_storage_locations usl ON usl.id = s.storage_location_id
       LEFT JOIN unresolved_scan_photos sp ON sp.scan_id = s.id
       WHERE s.user_id = $1
       GROUP BY s.id, usl.name
       ORDER BY s.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /bunker/unresolved
export async function createUnresolvedScan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { upc, storage_location_id, notes } = req.body;

    if (!upc?.trim()) {
      res.status(400).json({ error: 'upc is required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO unresolved_bottle_scans (user_id, upc, storage_location_id, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, upc.trim(), storage_location_id || null, notes?.trim() || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /bunker/unresolved/:id/photos
export async function uploadUnresolvedScanPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    // Verify ownership
    const scanCheck = await pool.query(
      'SELECT id FROM unresolved_bottle_scans WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (scanCheck.rows.length === 0) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }

    // Upload to R2
    const ext = file.originalname.split('.').pop() || 'jpg';
    const storageKey = `unresolved/${userId}/${id}/${Date.now()}.${ext}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    }));

    const cdnUrl = `${R2_PUBLIC_URL}/${storageKey}`;

    const photoCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM unresolved_scan_photos WHERE scan_id = $1',
      [id]
    );

    const result = await pool.query(
      `INSERT INTO unresolved_scan_photos (scan_id, cdn_url, display_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, cdnUrl, photoCount.rows[0].count]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /bunker/unresolved/:id/resolve
export async function resolveUnresolvedScan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { product_id, storage_location_id } = req.body;

    if (!product_id) {
      res.status(400).json({ error: 'product_id is required' });
      return;
    }

    // Verify ownership and get scan data
    const scanResult = await pool.query(
      'SELECT * FROM unresolved_bottle_scans WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (scanResult.rows.length === 0) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }
    const scan = scanResult.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert bunker_item
      const itemResult = await client.query(
        `INSERT INTO bunker_items (user_id, product_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, product_id) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [userId, product_id]
      );
      const bunkerItemId = itemResult.rows[0].id;

      // Create bottle using scan's location (or override)
      const locationId = storage_location_id !== undefined
        ? (storage_location_id || null)
        : scan.storage_location_id;

      const bottleResult = await client.query(
        `INSERT INTO bunker_bottles (bunker_item_id, storage_location_id, status)
         VALUES ($1, $2, 'sealed')
         RETURNING *`,
        [bunkerItemId, locationId]
      );
      const bottleId = bottleResult.rows[0].id;

      // Move photos: re-reference scan photos into bunker_bottle_photos
      const photos = await client.query(
        'SELECT * FROM unresolved_scan_photos WHERE scan_id = $1 ORDER BY display_order',
        [id]
      );

      if (photos.rows.length > 0) {
        // Derive storage_key from cdn_url for the photo record
        for (const photo of photos.rows) {
          const storageKey = photo.cdn_url.replace(`${R2_PUBLIC_URL}/`, '');
          await client.query(
            `INSERT INTO bunker_bottle_photos (bunker_bottle_id, storage_key, cdn_url, display_order)
             VALUES ($1, $2, $3, $4)`,
            [bottleId, storageKey, photo.cdn_url, photo.display_order]
          );
        }
      }

      // Delete the unresolved scan (cascade removes unresolved_scan_photos rows)
      await client.query('DELETE FROM unresolved_bottle_scans WHERE id = $1', [id]);

      await client.query('COMMIT');

      res.json({ bunker_item_id: bunkerItemId, bottle_id: bottleId });
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

// DELETE /bunker/unresolved/:id
export async function deleteUnresolvedScan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM unresolved_bottle_scans WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
