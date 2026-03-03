import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

// GET /release-notes — paginated published notes, newest first
export async function getReleaseNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50')), 100);
    const offset = parseInt(String(req.query.offset || '0'));

    const result = await pool.query(
      `SELECT id, title, body, type, version, created_at, updated_at
       FROM release_notes
       WHERE published = true
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM release_notes WHERE published = true'
    );

    res.json({ notes: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    next(err);
  }
}

// GET /release-notes/unread-count — count notes newer than user's last viewed timestamp
export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const userRow = await pool.query(
      'SELECT last_release_notes_viewed_at FROM users WHERE id = $1',
      [userId]
    );
    const lastViewed = userRow.rows[0]?.last_release_notes_viewed_at ?? null;

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM release_notes
       WHERE published = true
         AND ($1::timestamptz IS NULL OR created_at > $1::timestamptz)`,
      [lastViewed]
    );

    res.json({ count: result.rows[0].count });
  } catch (err) {
    next(err);
  }
}

// PUT /release-notes/mark-read — record that the user has viewed all current notes
export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    await pool.query(
      'UPDATE users SET last_release_notes_viewed_at = NOW() WHERE id = $1',
      [userId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /release-notes/admin — all notes including unpublished (admin/curator)
export async function adminGetReleaseNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT * FROM release_notes ORDER BY created_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /release-notes/admin — create a new release note (admin)
export async function createReleaseNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, body, type, version, published } = req.body;

    if (!title?.trim() || !body?.trim()) {
      res.status(400).json({ error: 'title and body are required' });
      return;
    }

    const validTypes = ['bug_fix', 'enhancement', 'new_feature', 'other'];
    const noteType = validTypes.includes(type) ? type : 'enhancement';

    const result = await pool.query(
      `INSERT INTO release_notes (title, body, type, version, published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title.trim(), body.trim(), noteType, version?.trim() || null, published !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PUT /release-notes/admin/:id — update a release note (admin)
export async function updateReleaseNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { title, body, type, version, published } = req.body;

    const validTypes = ['bug_fix', 'enhancement', 'new_feature', 'other'];

    const result = await pool.query(
      `UPDATE release_notes
       SET title = COALESCE($1, title),
           body = COALESCE($2, body),
           type = COALESCE($3, type),
           version = $4,
           published = COALESCE($5, published),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        title?.trim() || null,
        body?.trim() || null,
        type && validTypes.includes(type) ? type : null,
        version?.trim() || null,
        published != null ? published : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Release note not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /release-notes/admin/:id — delete a release note (admin)
export async function deleteReleaseNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM release_notes WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Release note not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
