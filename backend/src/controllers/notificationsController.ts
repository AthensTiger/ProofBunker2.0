import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

// In-memory SSE connection registry: userId → list of active Response objects
const connections = new Map<number, Response[]>();

// ── SSE stream ─────────────────────────────────────────

export function streamNotifications(req: Request, res: Response): void {
  const userId = req.user!.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if present
  res.flushHeaders();

  // Register connection
  const existing = connections.get(userId) || [];
  existing.push(res);
  connections.set(userId, existing);

  // Send initial heartbeat
  res.write('event: connected\ndata: {}\n\n');

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    const conns = connections.get(userId) || [];
    const filtered = conns.filter((r) => r !== res);
    if (filtered.length === 0) {
      connections.delete(userId);
    } else {
      connections.set(userId, filtered);
    }
  });
}

// ── Send notification (called by other controllers) ────

export async function sendNotification(
  userId: number,
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  // Persist to DB
  await pool.query(
    'INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)',
    [userId, type, JSON.stringify(payload)]
  );

  // Push to any active SSE connections for this user
  const conns = connections.get(userId);
  if (conns && conns.length > 0) {
    const data = JSON.stringify({ type, payload });
    for (const res of conns) {
      try {
        res.write(`event: notification\ndata: ${data}\n\n`);
      } catch {
        // Connection already closed — will be cleaned up on 'close' event
      }
    }
  }
}

// ── REST endpoints ─────────────────────────────────────

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT id, type, payload, read_at, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
