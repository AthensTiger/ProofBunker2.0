import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

export async function getMyShares(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT bs.*,
              u.display_name AS shared_with_name
       FROM bunker_shares bs
       LEFT JOIN users u ON u.id = bs.shared_with_user_id
       WHERE bs.owner_user_id = $1
       ORDER BY bs.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createShare(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { email, visibility } = req.body;

    if (!email?.trim()) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if the invited user already exists (case-insensitive)
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    const sharedWithUserId = existingUser.rows.length > 0 ? existingUser.rows[0].id : null;

    const defaultVisibility = {
      show_prices: true,
      show_locations: true,
      show_ratings: true,
      show_photos: true,
      show_quantities: true,
    };

    const result = await pool.query(
      `INSERT INTO bunker_shares (owner_user_id, shared_with_email, shared_with_user_id, visibility, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        email.trim().toLowerCase(),
        sharedWithUserId,
        JSON.stringify(visibility || defaultVisibility),
        sharedWithUserId ? 'active' : 'pending',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Already shared with this email' });
      return;
    }
    next(err);
  }
}

export async function updateShare(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { visibility } = req.body;

    const result = await pool.query(
      `UPDATE bunker_shares
       SET visibility = COALESCE($1, visibility)
       WHERE id = $2 AND owner_user_id = $3
       RETURNING *`,
      [visibility ? JSON.stringify(visibility) : null, id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteShare(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM bunker_shares WHERE id = $1 AND owner_user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── Shared bunker view (for the recipient) ────────────

export async function getSharedBunkers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    // Fix any pending shares that should be active (email matched but user_id wasn't linked)
    if (userEmail) {
      await pool.query(
        `UPDATE bunker_shares
         SET shared_with_user_id = $1, status = 'active', updated_at = NOW()
         WHERE LOWER(shared_with_email) = LOWER($2)
           AND status = 'pending'
           AND shared_with_user_id IS NULL`,
        [userId, userEmail]
      );
    }

    const result = await pool.query(
      `SELECT bs.id, bs.owner_user_id, bs.visibility, bs.created_at,
              COALESCE(u.display_name, u.email) AS owner_name, u.avatar_url AS owner_avatar
       FROM bunker_shares bs
       JOIN users u ON u.id = bs.owner_user_id
       WHERE bs.shared_with_user_id = $1 AND bs.status = 'active'
       ORDER BY COALESCE(u.display_name, u.email) ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getSharedBunkerItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { shareId } = req.params;

    // Verify this share is active and belongs to the viewer
    const shareResult = await pool.query(
      `SELECT * FROM bunker_shares
       WHERE id = $1 AND shared_with_user_id = $2 AND status = 'active'`,
      [shareId, userId]
    );

    if (shareResult.rows.length === 0) {
      res.status(404).json({ error: 'Shared bunker not found' });
      return;
    }

    const share = shareResult.rows[0];
    const vis = share.visibility;
    const ownerId = share.owner_user_id;

    // Build select list based on visibility
    const selectCols = [
      'bi.id', 'bi.product_id', 'bi.created_at',
      'p.name', 'p.slug', 'p.spirit_type', 'p.spirit_subtype',
      'p.abv', 'p.proof', 'p.age_statement',
      'c.name AS company_name',
    ];

    if (vis.show_ratings) selectCols.push('bi.personal_rating');
    if (vis.show_photos) selectCols.push('pi.cdn_url AS image_url');
    if (vis.show_quantities) selectCols.push('COUNT(bb.id)::int AS bottle_count');

    const joins = [
      'JOIN products p ON p.id = bi.product_id',
      'LEFT JOIN companies c ON c.id = p.company_id',
    ];
    if (vis.show_photos) {
      joins.push('LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true');
    }

    const leftJoinBottle = vis.show_quantities || vis.show_locations || vis.show_prices;
    if (leftJoinBottle) {
      joins.push('LEFT JOIN bunker_bottles bb ON bb.bunker_item_id = bi.id');
    }
    if (vis.show_locations) {
      joins.push('LEFT JOIN user_storage_locations usl ON usl.id = bb.storage_location_id');
      selectCols.push('ARRAY_REMOVE(ARRAY_AGG(DISTINCT usl.name), NULL) AS location_names');
    }

    const groupBy = ['bi.id', 'p.id', 'c.name'];
    if (vis.show_photos) groupBy.push('pi.cdn_url');

    const result = await pool.query(
      `SELECT ${selectCols.join(', ')}
       FROM bunker_items bi
       ${joins.join('\n       ')}
       WHERE bi.user_id = $1
         AND p.approval_status = 'approved'
       GROUP BY ${groupBy.join(', ')}
       ORDER BY p.name ASC`,
      [ownerId]
    );

    res.json({
      share: {
        id: share.id,
        visibility: share.visibility,
        owner_user_id: share.owner_user_id,
      },
      items: result.rows,
    });
  } catch (err) {
    next(err);
  }
}
