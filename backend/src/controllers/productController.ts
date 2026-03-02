import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

export async function searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = (req.query.q as string || '').trim();
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const spiritType = req.query.spirit_type as string;

    if (!q) {
      res.json({ products: [], total: 0 });
      return;
    }

    const conditions = [`p.approval_status = 'approved'`, `p.name ILIKE $1`];
    const params: (string | number)[] = [`%${q}%`];
    let paramIndex = 2;

    if (spiritType) {
      conditions.push(`p.spirit_type = $${paramIndex}`);
      params.push(spiritType);
      paramIndex++;
    }

    const where = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p WHERE ${where}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.spirit_type, p.spirit_subtype,
              p.abv, p.proof, p.age_statement, p.volume_ml, p.msrp_usd,
              p.is_limited_edition, p.is_discontinued,
              c.name AS company_name,
              d.name AS distiller_name,
              pi.cdn_url AS image_url
       FROM products p
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN distillers d ON d.id = p.distiller_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       WHERE ${where}
       ORDER BY p.name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductByUpc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { upc } = req.params;

    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.spirit_type, p.spirit_subtype,
              p.abv, p.proof, p.age_statement, p.volume_ml, p.msrp_usd,
              p.is_limited_edition, p.is_discontinued,
              c.name AS company_name,
              d.name AS distiller_name,
              pi.cdn_url AS image_url,
              pu.upc, pu.size_ml AS upc_size_ml
       FROM product_upcs pu
       JOIN products p ON p.id = pu.product_id
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN distillers d ON d.id = p.distiller_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       WHERE pu.upc = $1
         AND p.approval_status = 'approved'
       LIMIT 1`,
      [upc]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found for this UPC' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // Fetch product with company and distiller
    const productResult = await pool.query(
      `SELECT p.*,
              c.name AS company_name, c.country AS company_country,
              d.name AS distiller_name, d.region AS distiller_region, d.country AS distiller_country
       FROM products p
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN distillers d ON d.id = p.distiller_id
       WHERE p.id = $1
         AND p.approval_status = 'approved'`,
      [id]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const product = productResult.rows[0];

    // Fetch related data in parallel
    const [imagesResult, upcsResult, tastingResult] = await Promise.all([
      pool.query(
        `SELECT id, cdn_url, is_primary, image_type
         FROM product_images
         WHERE product_id = $1
         ORDER BY is_primary DESC, id ASC`,
        [id]
      ),
      pool.query(
        `SELECT id, upc, size_ml, container_type, is_canonical
         FROM product_upcs
         WHERE product_id = $1
         ORDER BY is_canonical DESC, id ASC`,
        [id]
      ),
      pool.query(
        `SELECT id, source_name, nose, palate, finish, overall_notes, rating_value, rating_scale
         FROM tasting_notes
         WHERE product_id = $1
         ORDER BY source_name ASC`,
        [id]
      ),
    ]);

    res.json({
      ...product,
      images: imagesResult.rows,
      upcs: upcsResult.rows,
      tasting_notes: tastingResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function autocomplete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = (req.query.q as string || '').trim();
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    if (q.length < 2) {
      res.json([]);
      return;
    }

    const result = await pool.query(
      `SELECT p.id, p.name, p.spirit_type,
              c.name AS company_name,
              pi.cdn_url AS image_url
       FROM products p
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       WHERE p.approval_status = 'approved'
         AND p.name ILIKE $1
       ORDER BY
         CASE WHEN p.name ILIKE $2 THEN 0 ELSE 1 END,
         p.name ASC
       LIMIT $3`,
      [`%${q}%`, `${q}%`, limit]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowedFields = [
      'name', 'spirit_type', 'spirit_subtype', 'abv', 'proof',
      'age_statement', 'volume_ml', 'mash_bill', 'barrel_type', 'barrel_char_level',
      'finish_type', 'distillation_method', 'batch_number', 'barrel_number',
      'vintage_year', 'release_year', 'is_limited_edition', 'is_discontinued',
      'is_single_cask', 'cask_strength', 'msrp_usd', 'description',
    ];
    for (const field of allowedFields) {
      if (field in req.body) {
        updates.push(`${field} = $${idx++}`);
        values.push(req.body[field] ?? null);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function upsertTastingNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = parseInt(req.params.id as string);
    const { id: noteId, source_name, nose, palate, finish, overall_notes, rating_value, rating_scale } = req.body;

    let result;
    if (noteId) {
      // Update existing note
      result = await pool.query(
        `UPDATE tasting_notes
         SET source_name = $1, nose = $2, palate = $3, finish = $4,
             overall_notes = $5, rating_value = $6, rating_scale = $7
         WHERE id = $8 AND product_id = $9
         RETURNING *`,
        [source_name || null, nose || null, palate || null, finish || null,
         overall_notes || null, rating_value || null, rating_scale || null,
         noteId, productId]
      );
    } else {
      // Insert new note
      result = await pool.query(
        `INSERT INTO tasting_notes (product_id, source_name, nose, palate, finish, overall_notes, rating_value, rating_scale)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [productId, source_name || null, nose || null, palate || null, finish || null,
         overall_notes || null, rating_value || null, rating_scale || null]
      );
    }

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tasting note not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteTastingNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, noteId } = req.params;
    const result = await pool.query(
      'DELETE FROM tasting_notes WHERE id = $1 AND product_id = $2 RETURNING id',
      [noteId, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tasting note not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function autocompleteCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = (req.query.q as string || '').trim();
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    if (q.length < 2) { res.json([]); return; }

    const result = await pool.query(
      `SELECT id, name, country
       FROM companies
       WHERE name ILIKE $1
       ORDER BY CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END, name ASC
       LIMIT $3`,
      [`%${q}%`, `${q}%`, limit]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function autocompleteDistillers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = (req.query.q as string || '').trim();
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    if (q.length < 2) { res.json([]); return; }

    const result = await pool.query(
      `SELECT id, name, country, region
       FROM distillers
       WHERE name ILIKE $1
       ORDER BY CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END, name ASC
       LIMIT $3`,
      [`%${q}%`, `${q}%`, limit]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getFilters(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT spirit_type, COUNT(*) AS count
       FROM products
       WHERE approval_status = 'approved'
       GROUP BY spirit_type
       ORDER BY spirit_type`
    );

    res.json({ spirit_types: result.rows });
  } catch (err) {
    next(err);
  }
}
