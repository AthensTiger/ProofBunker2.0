import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

export async function getMenuTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT mt.*,
              COUNT(mti.id)::int AS item_count
       FROM menu_templates mt
       LEFT JOIN menu_template_items mti ON mti.menu_template_id = mt.id
       WHERE mt.user_id = $1
       GROUP BY mt.id
       ORDER BY mt.name ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getMenuTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const templateResult = await pool.query(
      'SELECT * FROM menu_templates WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (templateResult.rows.length === 0) {
      res.status(404).json({ error: 'Menu template not found' });
      return;
    }

    const itemsResult = await pool.query(
      `SELECT mti.id, mti.bunker_item_id, mti.display_order, mti.section_override,
              p.name, p.spirit_type, p.spirit_subtype, p.proof, p.age_statement,
              p.description, p.abv,
              c.name AS company_name,
              bi.personal_rating,
              pi.cdn_url AS image_url
       FROM menu_template_items mti
       JOIN bunker_items bi ON bi.id = mti.bunker_item_id
       JOIN products p ON p.id = bi.product_id
       LEFT JOIN companies c ON c.id = p.company_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       WHERE mti.menu_template_id = $1
       ORDER BY mti.display_order ASC, p.name ASC`,
      [id]
    );

    res.json({
      ...templateResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function createMenuTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, title, subtitle, settings } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: 'Template name is required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO menu_templates (user_id, name, title, subtitle, settings)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name.trim(), title || null, subtitle || null, JSON.stringify(settings || {})]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateMenuTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, title, subtitle, settings } = req.body;

    const result = await pool.query(
      `UPDATE menu_templates
       SET name = COALESCE($1, name),
           title = $2,
           subtitle = $3,
           settings = COALESCE($4, settings)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name?.trim(), title ?? null, subtitle ?? null, settings ? JSON.stringify(settings) : null, id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Menu template not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteMenuTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM menu_templates WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Menu template not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function setMenuItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { items } = req.body; // [{ bunker_item_id, display_order, section_override }]

    // Verify template belongs to user
    const template = await pool.query(
      'SELECT id FROM menu_templates WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (template.rows.length === 0) {
      res.status(404).json({ error: 'Menu template not found' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing items
      await client.query('DELETE FROM menu_template_items WHERE menu_template_id = $1', [id]);

      // Insert new items
      if (items && items.length > 0) {
        const values = items.map((item: any, i: number) =>
          `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`
        ).join(', ');

        const params: any[] = [id];
        items.forEach((item: any) => {
          params.push(item.bunker_item_id, item.display_order || 0, item.section_override || null);
        });

        await client.query(
          `INSERT INTO menu_template_items (menu_template_id, bunker_item_id, display_order, section_override)
           VALUES ${values}`,
          params
        );
      }

      await client.query('COMMIT');
      res.json({ updated: items?.length || 0 });
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

export async function getMenuPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get template
    const templateResult = await pool.query(
      'SELECT * FROM menu_templates WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (templateResult.rows.length === 0) {
      res.status(404).json({ error: 'Menu template not found' });
      return;
    }

    const template = templateResult.rows[0];

    // Get items — if none exist, use full bunker
    const hasItems = await pool.query(
      'SELECT COUNT(*)::int AS count FROM menu_template_items WHERE menu_template_id = $1',
      [id]
    );

    let items;
    if (hasItems.rows[0].count > 0) {
      const itemsResult = await pool.query(
        `SELECT mti.section_override,
                bi.product_id,
                p.name, p.spirit_type, p.spirit_subtype, p.proof, p.abv,
                p.age_statement, p.description, p.mash_bill, p.msrp_usd,
                c.name AS company_name,
                bi.personal_rating,
                bi.notes,
                pi.cdn_url AS image_url,
                (SELECT MIN(bb.purchase_price) FROM bunker_bottles bb WHERE bb.bunker_item_id = bi.id AND bb.purchase_price IS NOT NULL) AS purchase_price
         FROM menu_template_items mti
         JOIN bunker_items bi ON bi.id = mti.bunker_item_id
         JOIN products p ON p.id = bi.product_id
         LEFT JOIN companies c ON c.id = p.company_id
         LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
         WHERE mti.menu_template_id = $1
         ORDER BY mti.display_order ASC, p.name ASC`,
        [id]
      );
      items = itemsResult.rows;
    } else {
      const allResult = await pool.query(
        `SELECT NULL AS section_override,
                bi.product_id,
                p.name, p.spirit_type, p.spirit_subtype, p.proof, p.abv,
                p.age_statement, p.description, p.mash_bill, p.msrp_usd,
                c.name AS company_name,
                bi.personal_rating,
                bi.notes,
                pi.cdn_url AS image_url,
                (SELECT MIN(bb.purchase_price) FROM bunker_bottles bb WHERE bb.bunker_item_id = bi.id AND bb.purchase_price IS NOT NULL) AS purchase_price
         FROM bunker_items bi
         JOIN products p ON p.id = bi.product_id
         LEFT JOIN companies c ON c.id = p.company_id
         LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
         WHERE bi.user_id = $1
           AND p.approval_status = 'approved'
         ORDER BY p.spirit_type ASC, p.name ASC`,
        [userId]
      );
      items = allResult.rows;
    }

    // Fetch tasting notes for all products in the menu
    const productIds = [...new Set(items.map((i: any) => i.product_id))];
    let tastingByProduct: Record<number, any[]> = {};
    if (productIds.length > 0) {
      const tastingResult = await pool.query(
        `SELECT product_id, source_name, nose, palate, finish, overall_notes, rating_value, rating_scale
         FROM tasting_notes WHERE product_id = ANY($1)
         ORDER BY product_id, source_name`,
        [productIds]
      );
      for (const note of tastingResult.rows) {
        if (!tastingByProduct[note.product_id]) tastingByProduct[note.product_id] = [];
        tastingByProduct[note.product_id].push(note);
      }
    }

    // Attach tasting notes and group by section (spirit_subtype preferred)
    const sections: Record<string, any[]> = {};
    for (const item of items) {
      item.tasting_notes = tastingByProduct[item.product_id] || [];
      const section = item.section_override || item.spirit_subtype || item.spirit_type || 'Other';
      if (!sections[section]) sections[section] = [];
      sections[section].push(item);
    }

    // Sort items alphabetically within each section
    for (const key of Object.keys(sections)) {
      sections[key].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    }

    // Return sections in alphabetical order
    const sortedSections: Record<string, any[]> = {};
    for (const key of Object.keys(sections).sort()) {
      sortedSections[key] = sections[key];
    }

    // Resolve print logo URL when show_logo is enabled
    let print_logo_url: string | null = null;
    const settings = template.settings || {};
    if (settings.show_logo) {
      let locQuery;
      if (hasItems.rows[0].count > 0) {
        locQuery = await pool.query(
          `SELECT DISTINCT usl.id, usl.logo_url
           FROM menu_template_items mti
           JOIN bunker_items bi ON bi.id = mti.bunker_item_id
           JOIN bunker_bottles bb ON bb.bunker_item_id = bi.id AND bb.status != 'empty'
           LEFT JOIN user_storage_locations usl ON usl.id = bb.storage_location_id AND usl.user_id = $2
           WHERE mti.menu_template_id = $1`,
          [id, userId]
        );
      } else {
        locQuery = await pool.query(
          `SELECT DISTINCT usl.id, usl.logo_url
           FROM bunker_items bi
           JOIN bunker_bottles bb ON bb.bunker_item_id = bi.id AND bb.status != 'empty'
           LEFT JOIN user_storage_locations usl ON usl.id = bb.storage_location_id
           WHERE bi.user_id = $1`,
          [userId]
        );
      }

      const uniqueLocIds = [...new Set(locQuery.rows.map((r: any) => r.id))].filter(Boolean);
      if (uniqueLocIds.length === 1) {
        print_logo_url = locQuery.rows.find((r: any) => r.id === uniqueLocIds[0])?.logo_url ?? null;
      }

      if (!print_logo_url) {
        const userRow = await pool.query('SELECT logo_url FROM users WHERE id = $1', [userId]);
        print_logo_url = userRow.rows[0]?.logo_url ?? null;
      }
    }

    res.json({
      template: { ...template, print_logo_url },
      sections: sortedSections,
    });
  } catch (err) {
    next(err);
  }
}
