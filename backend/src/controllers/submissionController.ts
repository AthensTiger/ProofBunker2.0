import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

export async function submitProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const {
      name, spirit_type, spirit_subtype, abv, proof, age_statement,
      volume_ml, mash_bill, barrel_type, barrel_char_level, finish_type,
      distillation_method, batch_number, barrel_number,
      vintage_year, release_year, is_limited_edition, is_discontinued,
      is_single_cask, cask_strength, msrp_usd, description,
      company_name, distiller_name, upc,
      storage_location_id, status, purchase_price,
      scan_id,
    } = req.body;

    if (!name?.trim() || !spirit_type) {
      res.status(400).json({ error: 'name and spirit_type are required' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create slug from name
      const slug = name.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Optionally find/create company
      let companyId: number | null = null;
      if (company_name?.trim()) {
        const existingCompany = await client.query(
          'SELECT id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1',
          [company_name.trim()]
        );
        if (existingCompany.rows.length > 0) {
          companyId = existingCompany.rows[0].id;
        } else {
          const companySlug = company_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const newCompany = await client.query(
            'INSERT INTO companies (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
            [company_name.trim(), companySlug]
          );
          companyId = newCompany.rows[0].id;
        }
      }

      // Optionally find/create distiller
      let distillerId: number | null = null;
      if (distiller_name?.trim()) {
        const existingDistiller = await client.query(
          'SELECT id FROM distillers WHERE LOWER(name) = LOWER($1) LIMIT 1',
          [distiller_name.trim()]
        );
        if (existingDistiller.rows.length > 0) {
          distillerId = existingDistiller.rows[0].id;
        } else {
          const distillerSlug = distiller_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const newDistiller = await client.query(
            'INSERT INTO distillers (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
            [distiller_name.trim(), distillerSlug]
          );
          distillerId = newDistiller.rows[0].id;
        }
      }

      // Create product with pending status
      const productResult = await client.query(
        `INSERT INTO products (
           name, slug, spirit_type, spirit_subtype, abv, proof,
           age_statement, volume_ml, mash_bill, barrel_type, barrel_char_level,
           finish_type, distillation_method, batch_number, barrel_number,
           vintage_year, release_year, is_limited_edition, is_discontinued,
           is_single_cask, cask_strength, msrp_usd, description,
           company_id, distiller_id, submitted_by_user_id, approval_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 'pending')
         RETURNING id`,
        [
          name.trim(), slug, spirit_type, spirit_subtype || null,
          abv || null, proof || null, age_statement || null,
          volume_ml || null, mash_bill || null, barrel_type || null,
          barrel_char_level || null, finish_type || null,
          distillation_method || null, batch_number || null, barrel_number || null,
          vintage_year || null, release_year || null,
          is_limited_edition ?? false, is_discontinued ?? false,
          is_single_cask ?? false, cask_strength ?? false,
          msrp_usd || null, description || null,
          companyId, distillerId, userId,
        ]
      );
      const productId = productResult.rows[0].id;

      // Add UPC if provided
      if (upc?.trim()) {
        await client.query(
          'INSERT INTO product_upcs (product_id, upc, is_canonical) VALUES ($1, $2, true)',
          [productId, upc.trim()]
        );
      }

      // Auto-add to user's bunker
      const itemResult = await client.query(
        'INSERT INTO bunker_items (user_id, product_id) VALUES ($1, $2) RETURNING id',
        [userId, productId]
      );

      // Create a bottle
      const bottleResult = await client.query(
        `INSERT INTO bunker_bottles (bunker_item_id, storage_location_id, status, purchase_price)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [itemResult.rows[0].id, storage_location_id || null, status || 'sealed', purchase_price || null]
      );
      const bottleId = bottleResult.rows[0].id;

      // If submitted from an unresolved scan, transfer photos and delete the scan
      if (scan_id) {
        const scanOwner = await client.query(
          'SELECT id FROM unresolved_bottle_scans WHERE id = $1 AND user_id = $2',
          [scan_id, userId]
        );
        if (scanOwner.rows.length > 0) {
          const r2Base = process.env.R2_PUBLIC_URL || '';
          const photos = await client.query(
            'SELECT cdn_url, display_order FROM unresolved_scan_photos WHERE scan_id = $1 ORDER BY display_order',
            [scan_id]
          );
          for (const photo of photos.rows) {
            const storageKey = r2Base ? photo.cdn_url.replace(r2Base + '/', '') : photo.cdn_url;
            await client.query(
              `INSERT INTO bunker_bottle_photos (bunker_bottle_id, storage_key, cdn_url, display_order)
               VALUES ($1, $2, $3, $4)`,
              [bottleId, storageKey, photo.cdn_url, photo.display_order]
            );
          }
          await client.query('DELETE FROM unresolved_bottle_scans WHERE id = $1', [scan_id]);
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        product_id: productId,
        bunker_item_id: itemResult.rows[0].id,
        approval_status: 'pending',
      });
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

export async function getMySubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT p.id, p.name, p.spirit_type, p.approval_status, p.created_at,
              c.name AS company_name
       FROM products p
       LEFT JOIN companies c ON c.id = p.company_id
       WHERE p.submitted_by_user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function updateSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const {
      name, spirit_type, spirit_subtype, abv, proof, age_statement,
      volume_ml, mash_bill, barrel_type, finish_type, description,
    } = req.body;

    // Only allow editing own rejected/pending submissions
    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           spirit_type = COALESCE($2, spirit_type),
           spirit_subtype = $3,
           abv = $4,
           proof = $5,
           age_statement = $6,
           volume_ml = $7,
           mash_bill = $8,
           barrel_type = $9,
           finish_type = $10,
           description = $11,
           approval_status = CASE
             WHEN approval_status = 'rejected' THEN 'pending'
             ELSE approval_status
           END
       WHERE id = $12
         AND submitted_by_user_id = $13
         AND approval_status IN ('pending', 'rejected')
       RETURNING id, name, approval_status`,
      [
        name?.trim(), spirit_type, spirit_subtype ?? null,
        abv ?? null, proof ?? null, age_statement ?? null,
        volume_ml ?? null, mash_bill ?? null, barrel_type ?? null,
        finish_type ?? null, description ?? null, id, userId,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Submission not found or cannot be edited' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Only allow deleting own rejected submissions
    const result = await pool.query(
      `DELETE FROM products
       WHERE id = $1
         AND submitted_by_user_id = $2
         AND approval_status = 'rejected'
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Submission not found or cannot be deleted' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function reassignSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { target_product_id } = req.body;

    if (!target_product_id) {
      res.status(400).json({ error: 'target_product_id is required' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify the rejected product belongs to user
      const rejected = await client.query(
        `SELECT id FROM products
         WHERE id = $1 AND submitted_by_user_id = $2 AND approval_status = 'rejected'`,
        [id, userId]
      );

      if (rejected.rows.length === 0) {
        res.status(404).json({ error: 'Rejected submission not found' });
        await client.query('ROLLBACK');
        return;
      }

      // Move bunker items from rejected product to target product
      // Use ON CONFLICT to merge if user already has the target product in bunker
      await client.query(
        `UPDATE bunker_items SET product_id = $1
         WHERE product_id = $2 AND user_id = $3
         AND NOT EXISTS (SELECT 1 FROM bunker_items WHERE product_id = $1 AND user_id = $3)`,
        [target_product_id, id, userId]
      );

      // Delete the rejected product (cascades bunker_items if not moved)
      await client.query('DELETE FROM products WHERE id = $1', [id]);

      await client.query('COMMIT');
      res.json({ reassigned_to: target_product_id });
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
