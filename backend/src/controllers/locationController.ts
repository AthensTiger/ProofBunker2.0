import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

export async function getLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT id, name, display_order
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

    const result = await pool.query(
      `INSERT INTO user_storage_locations (user_id, name)
       VALUES ($1, $2)
       RETURNING id, name, display_order`,
      [userId, name.trim()]
    );

    res.status(201).json(result.rows[0]);
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
