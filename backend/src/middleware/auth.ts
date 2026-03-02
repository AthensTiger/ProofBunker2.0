import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { UserRecord } from '../types';

export function requireRole(...roles: UserRecord['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

/**
 * Extract email from JWT payload claims.
 * Auth0 access tokens don't include email by default; it may be in a custom claim.
 */
function extractEmailFromToken(req: Request): string {
  const payload = req.auth?.payload as Record<string, unknown> | undefined;
  if (!payload) return '';
  return (payload['https://proofbunker.com/email'] as string)
    || (payload.email as string)
    || '';
}

/**
 * Fetch email from Auth0 /userinfo endpoint using the access token.
 * This works when the token was issued with `openid email` scope.
 */
async function fetchEmailFromAuth0(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader) return '';

  const issuer = process.env.AUTH0_ISSUER_BASE_URL;
  if (!issuer) return '';

  try {
    const res = await fetch(`${issuer}/userinfo`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return '';
    const data = await res.json() as { email?: string };
    return data.email || '';
  } catch {
    return '';
  }
}

/**
 * Activate any pending bunker_shares that match this user's email.
 */
async function activatePendingShares(userId: number, email: string): Promise<void> {
  if (!email) return;
  await pool.query(
    `UPDATE bunker_shares
     SET shared_with_user_id = $1, status = 'active', updated_at = NOW()
     WHERE LOWER(shared_with_email) = LOWER($2) AND status = 'pending'`,
    [userId, email]
  );
}

export async function ensureUserExists(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const auth0Id = req.auth?.payload?.sub;
    if (!auth0Id) {
      next(Object.assign(new Error('Missing auth subject'), { status: 401 }));
      return;
    }

    // Try to find existing user
    let result = await pool.query<UserRecord>(
      'SELECT * FROM users WHERE auth0_id = $1',
      [auth0Id]
    );

    if (result.rows.length === 0) {
      // Auto-create user on first authenticated request
      let email = extractEmailFromToken(req);
      if (!email) {
        email = await fetchEmailFromAuth0(req);
      }

      // First user in the system becomes admin
      const userCount = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
      const isFirstUser = userCount.rows[0].count === '0';

      result = await pool.query<UserRecord>(
        `INSERT INTO users (auth0_id, email, role)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [auth0Id, email, isFirstUser ? 'admin' : 'user']
      );

      await activatePendingShares(result.rows[0].id, email);
    } else if (!result.rows[0].email) {
      // Existing user with missing email — backfill it
      let email = extractEmailFromToken(req);
      if (!email) {
        email = await fetchEmailFromAuth0(req);
      }
      if (email) {
        result = await pool.query<UserRecord>(
          'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [email, result.rows[0].id]
        );
        await activatePendingShares(result.rows[0].id, email);
      }
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}
