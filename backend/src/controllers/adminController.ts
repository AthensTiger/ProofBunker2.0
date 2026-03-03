import { Request, Response, NextFunction } from 'express';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import pool from '../config/database';
import r2Client, { R2_BUCKET, R2_PUBLIC_URL } from '../config/r2';

// ── Pending Products ──────────────────────────────────

export async function getPendingProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT p.*,
              c.name AS company_name,
              d.name AS distiller_name,
              u.display_name AS submitted_by_name
       FROM products p
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN distillers d ON d.id = p.distiller_id
       LEFT JOIN users u ON u.id = p.submitted_by_user_id
       WHERE p.approval_status = 'pending'
       ORDER BY p.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function approveProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE products SET approval_status = 'approved', updated_at = NOW()
       WHERE id = $1 AND approval_status = 'pending'
       RETURNING id, name, approval_status`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Pending product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function rejectProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE products SET approval_status = 'rejected', updated_at = NOW()
       WHERE id = $1 AND approval_status = 'pending'
       RETURNING id, name, approval_status`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Pending product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ── Unverified Companies ──────────────────────────────

export async function getUnverifiedCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id)::int AS product_count
       FROM companies c
       LEFT JOIN products p ON p.company_id = c.id
       WHERE c.is_verified = false
       GROUP BY c.id
       ORDER BY c.name ASC`
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, website, country, description, is_verified } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
    if (website !== undefined) { updates.push(`website = $${idx++}`); values.push(website || null); }
    if (country !== undefined) { updates.push(`country = $${idx++}`); values.push(country || null); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description || null); }
    if (is_verified !== undefined) { updates.push(`is_verified = $${idx++}`); values.push(is_verified); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE companies SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ── Unverified Distillers ──────────────────────────────

export async function getUnverifiedDistillers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT d.*, COUNT(p.id)::int AS product_count
       FROM distillers d
       LEFT JOIN products p ON p.distiller_id = d.id
       WHERE d.is_verified = false
       GROUP BY d.id
       ORDER BY d.name ASC`
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function updateDistiller(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, country, region, city, address, latitude, longitude,
            website, founded_year, status, description, is_verified } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
    if (country !== undefined) { updates.push(`country = $${idx++}`); values.push(country || null); }
    if (region !== undefined) { updates.push(`region = $${idx++}`); values.push(region || null); }
    if (city !== undefined) { updates.push(`city = $${idx++}`); values.push(city || null); }
    if (address !== undefined) { updates.push(`address = $${idx++}`); values.push(address || null); }
    if (latitude !== undefined) { updates.push(`latitude = $${idx++}`); values.push(latitude || null); }
    if (longitude !== undefined) { updates.push(`longitude = $${idx++}`); values.push(longitude || null); }
    if (website !== undefined) { updates.push(`website = $${idx++}`); values.push(website || null); }
    if (founded_year !== undefined) { updates.push(`founded_year = $${idx++}`); values.push(founded_year || null); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status || null); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description || null); }
    if (is_verified !== undefined) { updates.push(`is_verified = $${idx++}`); values.push(is_verified); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE distillers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Distiller not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ── Admin Update Product (Part 4) ────────────────────

export async function adminUpdateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const {
      name, spirit_type, spirit_subtype, abv, proof, age_statement,
      volume_ml, mash_bill, barrel_type, barrel_char_level, finish_type,
      distillation_method, batch_number, barrel_number,
      vintage_year, release_year, is_limited_edition, is_discontinued,
      is_single_cask, cask_strength, msrp_usd, description,
      company_name, distiller_name, approval_status, upc,
    } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Resolve company_name to company_id if provided
      let companyId: number | null | undefined;
      if (company_name !== undefined) {
        if (company_name?.trim()) {
          const existing = await client.query(
            'SELECT id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [company_name.trim()]
          );
          if (existing.rows.length > 0) {
            companyId = existing.rows[0].id;
          } else {
            const slug = company_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const newC = await client.query(
              'INSERT INTO companies (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
              [company_name.trim(), slug]
            );
            companyId = newC.rows[0].id;
          }
        } else {
          companyId = null;
        }
      }

      // Resolve distiller_name to distiller_id if provided
      let distillerId: number | null | undefined;
      if (distiller_name !== undefined) {
        if (distiller_name?.trim()) {
          const existing = await client.query(
            'SELECT id FROM distillers WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [distiller_name.trim()]
          );
          if (existing.rows.length > 0) {
            distillerId = existing.rows[0].id;
          } else {
            const slug = distiller_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const newD = await client.query(
              'INSERT INTO distillers (name, slug, is_verified) VALUES ($1, $2, false) RETURNING id',
              [distiller_name.trim(), slug]
            );
            distillerId = newD.rows[0].id;
          }
        } else {
          distillerId = null;
        }
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const maybeSet = (col: string, val: unknown) => {
        if (val !== undefined) { updates.push(`${col} = $${idx++}`); values.push(val); }
      };

      if (name !== undefined) { maybeSet('name', name.trim()); maybeSet('slug', name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }
      maybeSet('spirit_type', spirit_type);
      maybeSet('spirit_subtype', spirit_subtype !== undefined ? (spirit_subtype || null) : undefined);
      maybeSet('abv', abv !== undefined ? (abv || null) : undefined);
      maybeSet('proof', proof !== undefined ? (proof || null) : undefined);
      maybeSet('age_statement', age_statement !== undefined ? (age_statement || null) : undefined);
      maybeSet('volume_ml', volume_ml !== undefined ? (volume_ml || null) : undefined);
      maybeSet('mash_bill', mash_bill !== undefined ? (mash_bill || null) : undefined);
      maybeSet('barrel_type', barrel_type !== undefined ? (barrel_type || null) : undefined);
      maybeSet('barrel_char_level', barrel_char_level !== undefined ? (barrel_char_level || null) : undefined);
      maybeSet('finish_type', finish_type !== undefined ? (finish_type || null) : undefined);
      maybeSet('distillation_method', distillation_method !== undefined ? (distillation_method || null) : undefined);
      maybeSet('batch_number', batch_number !== undefined ? (batch_number || null) : undefined);
      maybeSet('barrel_number', barrel_number !== undefined ? (barrel_number || null) : undefined);
      maybeSet('vintage_year', vintage_year !== undefined ? (vintage_year || null) : undefined);
      maybeSet('release_year', release_year !== undefined ? (release_year || null) : undefined);
      maybeSet('is_limited_edition', is_limited_edition);
      maybeSet('is_discontinued', is_discontinued);
      maybeSet('is_single_cask', is_single_cask);
      maybeSet('cask_strength', cask_strength);
      maybeSet('msrp_usd', msrp_usd !== undefined ? (msrp_usd || null) : undefined);
      maybeSet('description', description !== undefined ? (description || null) : undefined);
      maybeSet('company_id', companyId);
      maybeSet('distiller_id', distillerId);
      maybeSet('approval_status', approval_status);

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        await client.query('ROLLBACK');
        return;
      }

      values.push(id);
      const result = await client.query(
        `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
        values
      );

      // Handle UPC upsert in product_upcs table
      if (upc !== undefined) {
        if (upc && upc.trim()) {
          const existingUpc = await client.query(
            'SELECT id FROM product_upcs WHERE product_id = $1 AND is_canonical = true LIMIT 1',
            [id]
          );
          if (existingUpc.rows.length > 0) {
            await client.query(
              'UPDATE product_upcs SET upc = $1, updated_at = NOW() WHERE id = $2',
              [upc.trim(), existingUpc.rows[0].id]
            );
          } else {
            await client.query(
              'INSERT INTO product_upcs (product_id, upc, is_canonical) VALUES ($1, $2, true)',
              [id, upc.trim()]
            );
          }
        } else {
          // Clear canonical UPC if empty string sent
          await client.query(
            'DELETE FROM product_upcs WHERE product_id = $1 AND is_canonical = true',
            [id]
          );
        }
      }

      await client.query('COMMIT');

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json(result.rows[0]);
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

// ── Product Images (Part 3) ──────────────────────────

export async function uploadProductImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const photoCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM product_images WHERE product_id = $1',
      [id]
    );

    const ext = file.originalname.split('.').pop() || 'jpg';
    const storageKey = `products/${id}/${Date.now()}.${ext}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    }));

    const cdnUrl = `${R2_PUBLIC_URL}/${storageKey}`;
    const isPrimary = photoCount.rows[0].count === 0;

    const result = await pool.query(
      `INSERT INTO product_images (product_id, storage_key, cdn_url, is_primary, image_type)
       VALUES ($1, $2, $3, $4, 'bottle')
       RETURNING *`,
      [id, storageKey, cdnUrl, isPrimary]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function uploadProductImageFromUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    const photoCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM product_images WHERE product_id = $1',
      [id]
    );

    const response = await fetch(url);
    if (!response.ok) {
      res.status(400).json({ error: 'Failed to fetch image from URL' });
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      res.status(400).json({ error: 'URL does not point to an image' });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const storageKey = `products/${id}/${Date.now()}.${ext}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    }));

    const cdnUrl = `${R2_PUBLIC_URL}/${storageKey}`;
    const isPrimary = photoCount.rows[0].count === 0;

    const result = await pool.query(
      `INSERT INTO product_images (product_id, storage_key, cdn_url, is_primary, image_type)
       VALUES ($1, $2, $3, $4, 'bottle')
       RETURNING *`,
      [id, storageKey, cdnUrl, isPrimary]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteProductImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { imageId } = req.params;

    const photoResult = await pool.query(
      'SELECT id, storage_key, product_id, is_primary FROM product_images WHERE id = $1',
      [imageId]
    );

    if (photoResult.rows.length === 0) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const photo = photoResult.rows[0];

    if (photo.storage_key) {
      await r2Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: photo.storage_key,
      }));
    }

    await pool.query('DELETE FROM product_images WHERE id = $1', [imageId]);

    // If deleted was primary, promote next image
    if (photo.is_primary) {
      await pool.query(
        `UPDATE product_images SET is_primary = true
         WHERE product_id = $1 AND id = (
           SELECT id FROM product_images WHERE product_id = $1 ORDER BY id LIMIT 1
         )`,
        [photo.product_id]
      );
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── All Products (Part 5) ────────────────────────────

export async function getAllProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, spirit_type, approval_status, sort_by, sort_dir } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (q) {
      const qStr = (q as string).trim();
      if (/^\d{8,14}$/.test(qStr)) {
        // Looks like a barcode — search by UPC
        conditions.push(`p.id IN (SELECT product_id FROM product_upcs WHERE upc = $${idx++})`);
        params.push(qStr);
      } else {
        conditions.push(`p.name ILIKE $${idx++}`);
        params.push(`%${qStr}%`);
      }
    }
    if (spirit_type) {
      conditions.push(`p.spirit_type = $${idx++}`);
      params.push(spirit_type);
    }
    if (approval_status) {
      conditions.push(`p.approval_status = $${idx++}`);
      params.push(approval_status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts: Record<string, string> = {
      name: 'p.name', spirit_type: 'p.spirit_type', proof: 'p.proof',
      created_at: 'p.created_at', approval_status: 'p.approval_status',
    };
    const orderCol = allowedSorts[sort_by as string] || 'p.name';
    const orderDir = sort_dir === 'desc' ? 'DESC' : 'ASC';

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.spirit_type, p.spirit_subtype,
              p.proof, p.abv, p.approval_status, p.created_at,
              c.name AS company_name,
              d.name AS distiller_name,
              pi.cdn_url AS image_url
       FROM products p
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN distillers d ON d.id = p.distiller_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       ${where}
       ORDER BY ${orderCol} ${orderDir} NULLS LAST
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM products p ${where}`,
      params.slice(0, params.length - 2)
    );

    res.json({ products: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    next(err);
  }
}

export async function getAdminProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*,
              c.name AS company_name,
              d.name AS distiller_name
       FROM products p
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN distillers d ON d.id = p.distiller_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const images = await pool.query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, id',
      [id]
    );

    const upcs = await pool.query(
      'SELECT * FROM product_upcs WHERE product_id = $1 ORDER BY is_canonical DESC, id',
      [id]
    );

    res.json({ ...result.rows[0], images: images.rows, upcs: upcs.rows });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // Delete product images from R2 first
    const images = await pool.query(
      'SELECT storage_key FROM product_images WHERE product_id = $1 AND storage_key IS NOT NULL',
      [id]
    );

    for (const img of images.rows) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: img.storage_key }));
    }

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── All Companies (Part 6) ──────────────────────────

export async function getAllCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (q) {
      conditions.push(`c.name ILIKE $${idx++}`);
      params.push(`%${q}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id)::int AS product_count,
              pc.name AS parent_company_name
       FROM companies c
       LEFT JOIN products p ON p.company_id = c.id
       LEFT JOIN companies pc ON pc.id = c.parent_company_id
       ${where}
       GROUP BY c.id, pc.name
       ORDER BY c.name ASC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM companies c ${where}`,
      params.slice(0, params.length - 2)
    );

    res.json({ companies: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    next(err);
  }
}

export async function getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id)::int AS product_count,
              pc.name AS parent_company_name
       FROM companies c
       LEFT JOIN products p ON p.company_id = c.id
       LEFT JOIN companies pc ON pc.id = c.parent_company_id
       WHERE c.id = $1
       GROUP BY c.id, pc.name`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    await pool.query('UPDATE products SET company_id = NULL WHERE company_id = $1', [id]);

    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function mergeCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { target_id } = req.body;

    if (!target_id || parseInt(id as string) === target_id) {
      res.status(400).json({ error: 'Valid target_id is required' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('UPDATE products SET company_id = $1 WHERE company_id = $2', [target_id, id]);

      const result = await client.query('DELETE FROM companies WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Source company not found' });
        await client.query('ROLLBACK');
        return;
      }

      await client.query('COMMIT');
      res.json({ merged_into: target_id });
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

// ── All Distillers (Part 7) ─────────────────────────

export async function getAllDistillers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (q) {
      conditions.push(`d.name ILIKE $${idx++}`);
      params.push(`%${q}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT d.*, COUNT(p.id)::int AS product_count
       FROM distillers d
       LEFT JOIN products p ON p.distiller_id = d.id
       ${where}
       GROUP BY d.id
       ORDER BY d.name ASC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM distillers d ${where}`,
      params.slice(0, params.length - 2)
    );

    res.json({ distillers: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    next(err);
  }
}

export async function getDistiller(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.*, COUNT(p.id)::int AS product_count
       FROM distillers d
       LEFT JOIN products p ON p.distiller_id = d.id
       WHERE d.id = $1
       GROUP BY d.id`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Distiller not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteDistiller(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    await pool.query('UPDATE products SET distiller_id = NULL WHERE distiller_id = $1', [id]);

    const result = await pool.query('DELETE FROM distillers WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Distiller not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function mergeDistiller(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { target_id } = req.body;

    if (!target_id || parseInt(id as string) === target_id) {
      res.status(400).json({ error: 'Valid target_id is required' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('UPDATE products SET distiller_id = $1 WHERE distiller_id = $2', [target_id, id]);

      const result = await client.query('DELETE FROM distillers WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Source distiller not found' });
        await client.query('ROLLBACK');
        return;
      }

      await client.query('COMMIT');
      res.json({ merged_into: target_id });
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

// ── User Management (Admin only) ─────────────────────

export async function getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (q) {
      conditions.push(`(u.email ILIKE $${idx} OR u.display_name ILIKE $${idx})`);
      params.push(`%${q}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.role, u.age_verified, u.email_verified, u.features, u.created_at,
              COUNT(DISTINCT bi.id)::int AS bunker_count
       FROM users u
       LEFT JOIN bunker_items bi ON bi.user_id = u.id
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at ASC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM users u ${where}`,
      params.slice(0, params.length - 2)
    );

    res.json({ users: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentUser = req.user!;

    // Only admins can change roles (not curators)
    if (currentUser.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can manage user roles' });
      return;
    }

    // Validate role value
    const validRoles = ['user', 'curator', 'admin'];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be user, curator, or admin' });
      return;
    }

    // Prevent admin from demoting themselves
    if (parseInt(id as string) === currentUser.id && role !== 'admin') {
      res.status(400).json({ error: 'Cannot change your own role' });
      return;
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, display_name, role`,
      [role, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function setEmailVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { email_verified } = req.body;

    if (typeof email_verified !== 'boolean') {
      res.status(400).json({ error: 'email_verified must be a boolean' });
      return;
    }

    const result = await pool.query(
      `UPDATE users SET email_verified = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, email, display_name, role, email_verified`,
      [email_verified, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateUserFeatures(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    if (currentUser.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can manage user features' });
      return;
    }

    const { features } = req.body;
    if (!features || typeof features !== 'object') {
      res.status(400).json({ error: 'features must be an object' });
      return;
    }

    // Merge incoming toggles into existing features (don't wipe unknown keys)
    const result = await pool.query(
      `UPDATE users
       SET features = features || $1::jsonb, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, display_name, role, features`,
      [JSON.stringify(features), id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
