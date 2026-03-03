import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

// ── Conversations ──────────────────────────────────────

export async function getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT
         c.id,
         c.user_ids,
         c.last_message_at,
         c.created_at,
         -- other participant
         ou.id          AS other_user_id,
         COALESCE(ou.display_name, ou.email) AS other_user_name,
         ou.avatar_url  AS other_user_avatar,
         -- last message preview
         lm.content     AS last_message_content,
         lm.sender_id   AS last_message_sender_id,
         -- unread count
         (SELECT COUNT(*)::int
          FROM users_direct_messages udm
          WHERE udm.conversation_id = c.id
            AND udm.sender_id <> $1
            AND udm.read_at IS NULL) AS unread_count
       FROM users_conversations c
       JOIN users ou ON ou.id = (
         SELECT u FROM unnest(c.user_ids) u WHERE u <> $1 LIMIT 1
       )
       LEFT JOIN LATERAL (
         SELECT content, sender_id
         FROM users_direct_messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) lm ON true
       WHERE $1 = ANY(c.user_ids)
       ORDER BY c.last_message_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getOrCreateConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const otherUserId = parseInt(String(req.params.userId), 10);

    if (isNaN(otherUserId) || otherUserId === userId) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    // Verify the other user exists and is a contact (shares a bunker with current user)
    const contactCheck = await pool.query(
      `SELECT 1 FROM bunker_shares
       WHERE (owner_user_id = $1 AND shared_with_user_id = $2)
          OR (owner_user_id = $2 AND shared_with_user_id = $1)
          AND status = 'active'
       LIMIT 1`,
      [userId, otherUserId]
    );

    if (contactCheck.rows.length === 0) {
      res.status(403).json({ error: 'You can only message users you share a bunker with' });
      return;
    }

    // Find existing conversation
    const existing = await pool.query(
      `SELECT id FROM users_conversations
       WHERE user_ids @> ARRAY[$1, $2]::integer[]
         AND array_length(user_ids, 1) = 2`,
      [userId, otherUserId]
    );

    if (existing.rows.length > 0) {
      res.json({ id: existing.rows[0].id });
      return;
    }

    // Create new conversation
    const created = await pool.query(
      `INSERT INTO users_conversations (user_ids) VALUES (ARRAY[$1, $2]::integer[]) RETURNING id`,
      [userId, otherUserId]
    );

    res.status(201).json({ id: created.rows[0].id });
  } catch (err) {
    next(err);
  }
}

// ── Messages ───────────────────────────────────────────

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const conversationId = parseInt(String(req.params.id), 10);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string | undefined;

    // Verify participant
    const check = await pool.query(
      'SELECT 1 FROM users_conversations WHERE id = $1 AND $2 = ANY(user_ids)',
      [conversationId, userId]
    );
    if (check.rows.length === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const result = await pool.query(
      `SELECT m.id, m.sender_id, m.content, m.read_at, m.created_at,
              COALESCE(u.display_name, u.email) AS sender_name,
              u.avatar_url AS sender_avatar
       FROM users_direct_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
         ${before ? 'AND m.created_at < $3' : ''}
       ORDER BY m.created_at ASC
       LIMIT $2`,
      before ? [conversationId, limit, before] : [conversationId, limit]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const conversationId = parseInt(String(req.params.id), 10);
    const { content } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    // Verify participant
    const convResult = await pool.query(
      'SELECT user_ids FROM users_conversations WHERE id = $1 AND $2 = ANY(user_ids)',
      [conversationId, userId]
    );
    if (convResult.rows.length === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const message = await pool.query(
      `INSERT INTO users_direct_messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, content, read_at, created_at`,
      [conversationId, userId, content.trim()]
    );

    // Update last_message_at
    await pool.query(
      'UPDATE users_conversations SET last_message_at = NOW() WHERE id = $1',
      [conversationId]
    );

    // Notify the other participant
    const recipientId = convResult.rows[0].user_ids.find((id: number) => id !== userId);
    if (recipientId) {
      const senderName = req.user!.display_name || req.user!.email;
      // Import sendNotification lazily to avoid circular dependency at module load time
      try {
        const { sendNotification } = await import('./notificationsController');
        await sendNotification(recipientId, 'new_message', {
          conversationId,
          senderName,
          preview: content.trim().slice(0, 80),
        });
      } catch {
        // Notifications not yet wired up — safe to ignore
      }
    }

    res.status(201).json(message.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const conversationId = parseInt(String(req.params.id), 10);

    // Verify participant
    const check = await pool.query(
      'SELECT 1 FROM users_conversations WHERE id = $1 AND $2 = ANY(user_ids)',
      [conversationId, userId]
    );
    if (check.rows.length === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    await pool.query(
      `UPDATE users_direct_messages
       SET read_at = NOW()
       WHERE conversation_id = $1
         AND sender_id <> $2
         AND read_at IS NULL`,
      [conversationId, userId]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
