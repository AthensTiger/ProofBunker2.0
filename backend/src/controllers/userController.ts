import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(req.user);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { display_name, avatar_url } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3
       RETURNING *`,
      [display_name, avatar_url, userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function verifyAge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `UPDATE users SET age_verified = true WHERE id = $1 RETURNING *`,
      [userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function getContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    // Return users connected via active bunker shares (either direction)
    const result = await pool.query(
      `SELECT DISTINCT u.id,
              COALESCE(u.display_name, u.email) AS name,
              u.avatar_url
       FROM bunker_shares bs
       JOIN users u ON u.id = CASE
         WHEN bs.owner_user_id = $1 THEN bs.shared_with_user_id
         ELSE bs.owner_user_id
       END
       WHERE (bs.owner_user_id = $1 OR bs.shared_with_user_id = $1)
         AND bs.status = 'active'
         AND u.id IS NOT NULL
       ORDER BY name ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const preferences = req.body;

    const result = await pool.query(
      `UPDATE users SET preferences = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(preferences), userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
