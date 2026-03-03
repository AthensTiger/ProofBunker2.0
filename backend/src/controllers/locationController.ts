import { Request, Response, NextFunction } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import pool from '../config/database';
import r2Client, { R2_BUCKET, R2_PUBLIC_URL } from '../config/r2';

export async function getLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT id, name, display_order, logo_url
       FROM user_storage_locations
       WHERE user_id = $1
       ORDER BY display_order ASC, name ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: 'Location name is required' });
      return;
    }

    // Check if this is the user's first location
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM user_storage_locations WHERE user_id = $1',
      [userId]
    );
    const isFirstLocation = parseInt(countResult.rows[0].count) === 0;

    const result = await pool.query(
      `INSERT INTO user_storage_locations (user_id, name)
       VALUES ($1, $2)
       RETURNING id, name, display_order`,
      [userId, name.trim()]
    );

    const newLocation = result.rows[0];

    // If this is the first location, migrate all existing unlocated bottles to it
    if (isFirstLocation) {
      await pool.query(
        `UPDATE bunker_bottles
         SET storage_location_id = $1
         WHERE bunker_item_id IN (SELECT id FROM bunker_items WHERE user_id = $2)
           AND storage_location_id IS NULL`,
        [newLocation.id, userId]
      );
    }

    res.status(201).json(newLocation);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'A location with this name already exists' });
      return;
    }
    next(err);
  }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, display_order } = req.body;

    const result = await pool.query(
      `UPDATE user_storage_locations
       SET name = COALESCE($1, name),
           display_order = COALESCE($2, display_order)
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, display_order`,
      [name?.trim(), display_order, id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'A location with this name already exists' });
      return;
    }
    next(err);
  }
}

export async function deleteLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Block deletion if any bottles are assigned to this location
    const bottleCheck = await pool.query(
      `SELECT COUNT(*) FROM bunker_bottles bb
       JOIN bunker_items bi ON bi.id = bb.bunker_item_id
       WHERE bi.user_id = $1 AND bb.storage_location_id = $2`,
      [userId, id]
    );

    if (parseInt(bottleCheck.rows[0].count) > 0) {
      res.status(400).json({ error: 'Cannot delete a location that has bottles assigned to it. Move the bottles to another location first.' });
      return;
    }

    const result = await pool.query(
      `DELETE FROM user_storage_locations
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function uploadLocationLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id FROM user_storage_locations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const storageKey = `locations/${userId}/${id}/${Date.now()}.${ext}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    }));

    const cdnUrl = `${R2_PUBLIC_URL}/${storageKey}`;

    const result = await pool.query(
      `UPDATE user_storage_locations
       SET logo_url = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, display_order, logo_url`,
      [cdnUrl, id, userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
