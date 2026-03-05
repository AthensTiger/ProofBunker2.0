import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

// ── List Corrections ──────────────────────────────────

export async function getCorrections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, min_confidence, sort_by, sort_dir } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`pc.status = $${idx++}`);
      params.push(status);
    }
    if (min_confidence) {
      conditions.push(`pc.confidence >= $${idx++}`);
      params.push(parseFloat(min_confidence as string));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts: Record<string, string> = {
      confidence: 'pc.confidence',
      created_at: 'pc.created_at',
      product_name: 'pc.current_name',
      status: 'pc.status',
    };
    const orderCol = allowedSorts[sort_by as string] || 'pc.confidence';
    const orderDir = sort_dir === 'asc' ? 'ASC' : 'DESC';

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT pc.*,
              pi.cdn_url AS product_image_url
       FROM product_corrections pc
       LEFT JOIN product_images pi ON pi.product_id = pc.product_id AND pi.is_primary = true
       ${where}
       ORDER BY ${orderCol} ${orderDir} NULLS LAST
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM product_corrections pc ${where}`,
      params.slice(0, params.length - 2)
    );

    res.json({ corrections: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    next(err);
  }
}

// ── Get Single Correction ─────────────────────────────

export async function getCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pc.*,
              pi.cdn_url AS product_image_url
       FROM product_corrections pc
       LEFT JOIN product_images pi ON pi.product_id = pc.product_id AND pi.is_primary = true
       WHERE pc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Correction not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ── Approve Correction (apply all proposed fields) ────

export async function approveCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;

    const corrResult = await pool.query(
      'SELECT * FROM product_corrections WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (corrResult.rows.length === 0) {
      res.status(404).json({ error: 'Pending correction not found' });
      return;
    }

    const corr = corrResult.rows[0];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Build dynamic update for products table
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const maybeSet = (col: string, proposed: unknown) => {
        if (proposed !== null && proposed !== undefined) {
          updates.push(`${col} = $${idx++}`);
          values.push(proposed);
        }
      };

      maybeSet('name', corr.proposed_name);
      maybeSet('proof', corr.proposed_proof);
      maybeSet('abv', corr.proposed_abv);
      maybeSet('age_statement', corr.proposed_age_statement);
      maybeSet('spirit_type', corr.proposed_spirit_type);
      maybeSet('spirit_subtype', corr.proposed_spirit_subtype);
      maybeSet('mash_bill', corr.proposed_mash_bill);
      maybeSet('barrel_type', corr.proposed_barrel_type);
      maybeSet('description', corr.proposed_description);
      maybeSet('msrp_usd', corr.proposed_msrp_usd);

      // Update slug if name changed
      if (corr.proposed_name) {
        const slug = corr.proposed_name.trim().toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        updates.push(`slug = $${idx++}`);
        values.push(slug);
      }

      // Handle company_name -> company_id
      if (corr.proposed_company_name) {
        const existing = await client.query(
          'SELECT id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1',
          [corr.proposed_company_name.trim()]
        );
        let companyId: number;
        if (existing.rows.length > 0) {
          companyId = existing.rows[0].id;
        } else {
          const slug = corr.proposed_company_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const newC = await client.query(
            'INSERT INTO companies (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
            [corr.proposed_company_name.trim(), slug]
          );
          companyId = newC.rows[0].id;
        }
        updates.push(`company_id = $${idx++}`);
        values.push(companyId);
      }

      // Handle distiller_name -> distiller_id
      if (corr.proposed_distiller_name) {
        const existing = await client.query(
          'SELECT id FROM distillers WHERE LOWER(name) = LOWER($1) LIMIT 1',
          [corr.proposed_distiller_name.trim()]
        );
        let distillerId: number;
        if (existing.rows.length > 0) {
          distillerId = existing.rows[0].id;
        } else {
          const slug = corr.proposed_distiller_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const newD = await client.query(
            'INSERT INTO distillers (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
            [corr.proposed_distiller_name.trim(), slug]
          );
          distillerId = newD.rows[0].id;
        }
        updates.push(`distiller_id = $${idx++}`);
        values.push(distillerId);
      }

      if (updates.length > 0) {
        values.push(corr.product_id);
        await client.query(
          `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
          values
        );
      }

      // Mark correction as approved
      await client.query(
        `UPDATE product_corrections SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
        [adminId, id]
      );

      await client.query('COMMIT');

      res.json({ status: 'approved', product_id: corr.product_id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

// ── Partial Approve (apply selected fields only) ──────

export async function partialApproveCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { fields } = req.body; // array of field names to apply, e.g. ["name", "proof", "distiller_name"]
    const adminId = req.user!.id;

    if (!Array.isArray(fields) || fields.length === 0) {
      res.status(400).json({ error: 'fields array is required' });
      return;
    }

    const allowedFields = [
      'name', 'company_name', 'distiller_name', 'proof', 'abv',
      'age_statement', 'spirit_type', 'spirit_subtype',
      'mash_bill', 'barrel_type', 'description', 'msrp_usd',
    ];
    const invalidFields = fields.filter((f: string) => !allowedFields.includes(f));
    if (invalidFields.length > 0) {
      res.status(400).json({ error: `Invalid fields: ${invalidFields.join(', ')}` });
      return;
    }

    const corrResult = await pool.query(
      'SELECT * FROM product_corrections WHERE id = $1 AND status IN ($2, $3)',
      [id, 'pending', 'partial']
    );

    if (corrResult.rows.length === 0) {
      res.status(404).json({ error: 'Correction not found or already fully reviewed' });
      return;
    }

    const corr = corrResult.rows[0];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      for (const field of fields) {
        const proposedKey = `proposed_${field}`;
        const proposedVal = corr[proposedKey];
        if (proposedVal === null || proposedVal === undefined) continue;

        if (field === 'company_name') {
          // Resolve to company_id
          const existing = await client.query(
            'SELECT id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [proposedVal.trim()]
          );
          let companyId: number;
          if (existing.rows.length > 0) {
            companyId = existing.rows[0].id;
          } else {
            const slug = proposedVal.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const newC = await client.query(
              'INSERT INTO companies (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
              [proposedVal.trim(), slug]
            );
            companyId = newC.rows[0].id;
          }
          updates.push(`company_id = $${idx++}`);
          values.push(companyId);
        } else if (field === 'distiller_name') {
          // Resolve to distiller_id
          const existing = await client.query(
            'SELECT id FROM distillers WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [proposedVal.trim()]
          );
          let distillerId: number;
          if (existing.rows.length > 0) {
            distillerId = existing.rows[0].id;
          } else {
            const slug = proposedVal.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const newD = await client.query(
              'INSERT INTO distillers (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
              [proposedVal.trim(), slug]
            );
            distillerId = newD.rows[0].id;
          }
          updates.push(`distiller_id = $${idx++}`);
          values.push(distillerId);
        } else if (field === 'name') {
          updates.push(`name = $${idx++}`);
          values.push(proposedVal);
          const slug = proposedVal.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          updates.push(`slug = $${idx++}`);
          values.push(slug);
        } else {
          updates.push(`${field} = $${idx++}`);
          values.push(proposedVal);
        }
      }

      if (updates.length > 0) {
        values.push(corr.product_id);
        await client.query(
          `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
          values
        );
      }

      // Mark as partial
      await client.query(
        `UPDATE product_corrections SET status = 'partial', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
        [adminId, id]
      );

      await client.query('COMMIT');

      res.json({ status: 'partial', applied_fields: fields, product_id: corr.product_id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

// ── Reject Correction ─────────────────────────────────

export async function rejectCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;

    const result = await pool.query(
      `UPDATE product_corrections SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2 AND status IN ('pending', 'partial')
       RETURNING id, product_id`,
      [adminId, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Correction not found or already reviewed' });
      return;
    }

    res.json({ status: 'rejected', product_id: result.rows[0].product_id });
  } catch (err) {
    next(err);
  }
}

// ── Bulk Approve (high-confidence corrections) ────────

export async function bulkApproveCorrections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { min_confidence, ids } = req.body;
    const adminId = req.user!.id;

    if (!ids && !min_confidence) {
      res.status(400).json({ error: 'Provide ids array or min_confidence threshold' });
      return;
    }

    let corrections;
    if (ids && Array.isArray(ids)) {
      corrections = await pool.query(
        `SELECT * FROM product_corrections WHERE id = ANY($1) AND status = 'pending'`,
        [ids]
      );
    } else {
      corrections = await pool.query(
        `SELECT * FROM product_corrections WHERE confidence >= $1 AND status = 'pending'`,
        [min_confidence]
      );
    }

    let approved = 0;
    let errors = 0;

    for (const corr of corrections.rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const updates: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        const maybeSet = (col: string, proposed: unknown) => {
          if (proposed !== null && proposed !== undefined) {
            updates.push(`${col} = $${idx++}`);
            values.push(proposed);
          }
        };

        maybeSet('name', corr.proposed_name);
        maybeSet('proof', corr.proposed_proof);
        maybeSet('abv', corr.proposed_abv);
        maybeSet('age_statement', corr.proposed_age_statement);
        maybeSet('spirit_type', corr.proposed_spirit_type);
        maybeSet('spirit_subtype', corr.proposed_spirit_subtype);
        maybeSet('mash_bill', corr.proposed_mash_bill);
        maybeSet('barrel_type', corr.proposed_barrel_type);
        maybeSet('description', corr.proposed_description);
        maybeSet('msrp_usd', corr.proposed_msrp_usd);

        if (corr.proposed_name) {
          const slug = corr.proposed_name.trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          updates.push(`slug = $${idx++}`);
          values.push(slug);
        }

        // Resolve company
        if (corr.proposed_company_name) {
          const existing = await client.query(
            'SELECT id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [corr.proposed_company_name.trim()]
          );
          let companyId: number;
          if (existing.rows.length > 0) {
            companyId = existing.rows[0].id;
          } else {
            const slug = corr.proposed_company_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const newC = await client.query(
              'INSERT INTO companies (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
              [corr.proposed_company_name.trim(), slug]
            );
            companyId = newC.rows[0].id;
          }
          updates.push(`company_id = $${idx++}`);
          values.push(companyId);
        }

        // Resolve distiller
        if (corr.proposed_distiller_name) {
          const existing = await client.query(
            'SELECT id FROM distillers WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [corr.proposed_distiller_name.trim()]
          );
          let distillerId: number;
          if (existing.rows.length > 0) {
            distillerId = existing.rows[0].id;
          } else {
            const slug = corr.proposed_distiller_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const newD = await client.query(
              'INSERT INTO distillers (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
              [corr.proposed_distiller_name.trim(), slug]
            );
            distillerId = newD.rows[0].id;
          }
          updates.push(`distiller_id = $${idx++}`);
          values.push(distillerId);
        }

        if (updates.length > 0) {
          values.push(corr.product_id);
          await client.query(
            `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
            values
          );
        }

        await client.query(
          `UPDATE product_corrections SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
          [adminId, corr.id]
        );

        await client.query('COMMIT');
        approved++;
      } catch (err) {
        await client.query('ROLLBACK');
        errors++;
        console.error(`Error applying correction ${corr.id}:`, (err as Error).message);
      } finally {
        client.release();
      }
    }

    res.json({ approved, errors, total: corrections.rows.length });
  } catch (err) {
    next(err);
  }
}

// ── Cleanup Progress ──────────────────────────────────

export async function getCleanupProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const progress = await pool.query('SELECT * FROM cleanup_progress ORDER BY id DESC LIMIT 1');

    const stats = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
         COUNT(*) FILTER (WHERE status = 'partial')::int AS partial,
         ROUND(AVG(confidence)::numeric, 2) AS avg_confidence
       FROM product_corrections`
    );

    res.json({
      progress: progress.rows[0] || null,
      stats: stats.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
