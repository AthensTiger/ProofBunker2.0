import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

/**
 * GET /api/v1/admin/settings
 * Returns all system settings as a flat object.
 */
export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query('SELECT key, value FROM system_settings');
    const settings: Record<string, unknown> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/settings
 * Update one or more settings. Body is { key: value, ... }
 */
export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      res.status(400).json({ error: 'Body must be an object of { key: value } pairs' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of Object.entries(updates)) {
        await client.query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Return updated settings
    const result = await pool.query('SELECT key, value FROM system_settings');
    const settings: Record<string, unknown> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/settings/public
 * Returns non-sensitive settings that the frontend needs (no auth required).
 */
export async function getPublicSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const publicKeys = ['require_label_verification'];
    const result = await pool.query(
      'SELECT key, value FROM system_settings WHERE key = ANY($1)',
      [publicKeys]
    );
    const settings: Record<string, unknown> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
}
