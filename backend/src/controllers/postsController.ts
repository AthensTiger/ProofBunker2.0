import { Request, Response } from 'express';
import pool from '../config/database';

// ── Public: published feed ────────────────────────────────────────────────────

export async function getPublishedPosts(req: Request, res: Response): Promise<void> {
  const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);
  const offset = parseInt(String(req.query.offset || '0'), 10);

  const result = await pool.query(
    `SELECT
       p.id, p.title, p.content, p.status, p.created_at, p.updated_at,
       COALESCE(u.display_name, u.email) AS author_name,
       p.product_id,
       pr.name AS product_name
     FROM user_posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN products pr ON pr.id = p.product_id
     WHERE p.status IN ('published', 'public')
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json(result.rows);
}

// ── Authenticated: my posts ───────────────────────────────────────────────────

export async function getMyPosts(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const result = await pool.query(
    `SELECT
       p.id, p.title, p.content, p.status, p.created_at, p.updated_at,
       p.product_id,
       pr.name AS product_name,
       (SELECT a.decision FROM post_approvals a WHERE a.post_id = p.id ORDER BY a.created_at DESC LIMIT 1) AS last_decision,
       (SELECT a.notes FROM post_approvals a WHERE a.post_id = p.id ORDER BY a.created_at DESC LIMIT 1) AS last_notes
     FROM user_posts p
     LEFT JOIN products pr ON pr.id = p.product_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );

  res.json(result.rows);
}

// ── Create draft ──────────────────────────────────────────────────────────────

export async function createPost(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { title, content, product_id } = req.body as {
    title: string;
    content: string;
    product_id?: number | null;
  };

  if (!title?.trim() || !content?.trim()) {
    res.status(400).json({ error: 'title and content are required' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO user_posts (user_id, title, content, product_id, status)
     VALUES ($1, $2, $3, $4, 'draft')
     RETURNING *`,
    [userId, title.trim(), content.trim(), product_id ?? null]
  );

  res.status(201).json(result.rows[0]);
}

// ── Update draft ──────────────────────────────────────────────────────────────

export async function updatePost(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const postId = parseInt(String(req.params.id), 10);
  const { title, content, product_id } = req.body as {
    title?: string;
    content?: string;
    product_id?: number | null;
  };

  const existing = await pool.query(
    'SELECT * FROM user_posts WHERE id = $1',
    [postId]
  );

  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  const post = existing.rows[0];

  if (post.user_id !== userId) {
    res.status(403).json({ error: 'Not your post' });
    return;
  }

  if (post.status !== 'draft') {
    res.status(409).json({ error: 'Only draft posts can be edited' });
    return;
  }

  const result = await pool.query(
    `UPDATE user_posts
     SET title = COALESCE($1, title),
         content = COALESCE($2, content),
         product_id = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [title?.trim() ?? null, content?.trim() ?? null, product_id ?? null, postId]
  );

  res.json(result.rows[0]);
}

// ── Submit for review ─────────────────────────────────────────────────────────

export async function submitPost(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const postId = parseInt(String(req.params.id), 10);

  const existing = await pool.query(
    'SELECT * FROM user_posts WHERE id = $1',
    [postId]
  );

  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  const post = existing.rows[0];

  if (post.user_id !== userId) {
    res.status(403).json({ error: 'Not your post' });
    return;
  }

  if (post.status !== 'draft') {
    res.status(409).json({ error: 'Only draft posts can be submitted' });
    return;
  }

  const result = await pool.query(
    `UPDATE user_posts SET status = 'pending_approval', updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [postId]
  );

  res.json(result.rows[0]);
}

// ── Delete post ───────────────────────────────────────────────────────────────

export async function deletePost(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const postId = parseInt(String(req.params.id), 10);

  const existing = await pool.query(
    'SELECT * FROM user_posts WHERE id = $1',
    [postId]
  );

  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  const post = existing.rows[0];

  if (post.user_id !== userId && userRole !== 'admin') {
    res.status(403).json({ error: 'Not allowed' });
    return;
  }

  if (post.user_id === userId && post.status !== 'draft' && userRole !== 'admin') {
    res.status(409).json({ error: 'Only draft posts can be deleted by authors' });
    return;
  }

  await pool.query('DELETE FROM user_posts WHERE id = $1', [postId]);
  res.json({ success: true });
}

// ── Curator/Admin: pending queue ──────────────────────────────────────────────

export async function getPendingPosts(req: Request, res: Response): Promise<void> {
  const result = await pool.query(
    `SELECT
       p.id, p.title, p.content, p.status, p.created_at,
       COALESCE(u.display_name, u.email) AS author_name,
       p.product_id,
       pr.name AS product_name
     FROM user_posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN products pr ON pr.id = p.product_id
     WHERE p.status = 'pending_approval'
     ORDER BY p.created_at ASC`
  );

  res.json(result.rows);
}

// ── Curator/Admin: approve ────────────────────────────────────────────────────

export async function approvePost(req: Request, res: Response): Promise<void> {
  const curatorId = req.user!.id;
  const postId = parseInt(String(req.params.id), 10);
  const { notes } = req.body as { notes?: string };

  const existing = await pool.query(
    'SELECT * FROM user_posts WHERE id = $1',
    [postId]
  );

  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  if (existing.rows[0].status !== 'pending_approval') {
    res.status(409).json({ error: 'Post is not pending approval' });
    return;
  }

  await pool.query(
    `INSERT INTO post_approvals (post_id, curator_id, decision, notes)
     VALUES ($1, $2, 'approved', $3)`,
    [postId, curatorId, notes ?? null]
  );

  const result = await pool.query(
    `UPDATE user_posts SET status = 'published', updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [postId]
  );

  // Notify author
  const { sendNotification } = await import('./notificationsController');
  await sendNotification(existing.rows[0].user_id, 'post_approved', {
    postTitle: existing.rows[0].title,
    postId,
  });

  res.json(result.rows[0]);
}

// ── Curator/Admin: reject ─────────────────────────────────────────────────────

export async function rejectPost(req: Request, res: Response): Promise<void> {
  const curatorId = req.user!.id;
  const postId = parseInt(String(req.params.id), 10);
  const { notes } = req.body as { notes?: string };

  const existing = await pool.query(
    'SELECT * FROM user_posts WHERE id = $1',
    [postId]
  );

  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  if (existing.rows[0].status !== 'pending_approval') {
    res.status(409).json({ error: 'Post is not pending approval' });
    return;
  }

  await pool.query(
    `INSERT INTO post_approvals (post_id, curator_id, decision, notes)
     VALUES ($1, $2, 'rejected', $3)`,
    [postId, curatorId, notes ?? null]
  );

  // Rejected posts go back to draft so author can revise
  const result = await pool.query(
    `UPDATE user_posts SET status = 'draft', updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [postId]
  );

  // Notify author
  const { sendNotification } = await import('./notificationsController');
  await sendNotification(existing.rows[0].user_id, 'post_rejected', {
    postTitle: existing.rows[0].title,
    postId,
    notes: notes ?? '',
  });

  res.json(result.rows[0]);
}
