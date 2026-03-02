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
