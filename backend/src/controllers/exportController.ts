import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import pool from '../config/database';

async function getBunkerData(userId: number) {
  const result = await pool.query(
    `SELECT bi.personal_rating, bi.notes,
            p.name, p.spirit_type, p.spirit_subtype, p.proof, p.abv,
            p.age_statement, p.msrp_usd,
            c.name AS company_name,
            d.name AS distiller_name,
            COUNT(bb.id)::int AS bottle_count,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT usl.name), NULL) AS location_names,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT bb.status), NULL) AS statuses,
            MIN(bb.purchase_price) AS min_price,
            MAX(bb.purchase_price) AS max_price
     FROM bunker_items bi
     JOIN products p ON p.id = bi.product_id
     LEFT JOIN companies c ON c.id = p.company_id
     LEFT JOIN distillers d ON d.id = p.distiller_id
     LEFT JOIN bunker_bottles bb ON bb.bunker_item_id = bi.id
     LEFT JOIN user_storage_locations usl ON usl.id = bb.storage_location_id
     WHERE bi.user_id = $1
       AND p.approval_status = 'approved'
     GROUP BY bi.id, p.id, c.name, d.name
     ORDER BY p.spirit_type ASC, p.name ASC`,
    [userId]
  );
  return result.rows;
}

export async function exportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const items = await getBunkerData(userId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bunker');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 35 },
      { header: 'Company', key: 'company_name', width: 25 },
      { header: 'Distiller', key: 'distiller_name', width: 25 },
      { header: 'Type', key: 'spirit_type', width: 12 },
      { header: 'Subtype', key: 'spirit_subtype', width: 15 },
      { header: 'Proof', key: 'proof', width: 8 },
      { header: 'ABV', key: 'abv', width: 8 },
      { header: 'Age', key: 'age_statement', width: 12 },
      { header: 'Qty', key: 'bottle_count', width: 6 },
      { header: 'Rating', key: 'personal_rating', width: 8 },
      { header: 'Locations', key: 'locations', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Price Paid', key: 'price', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];

    // Bold header row
    sheet.getRow(1).font = { bold: true };

    for (const item of items) {
      sheet.addRow({
        name: item.name,
        company_name: item.company_name,
        distiller_name: item.distiller_name,
        spirit_type: item.spirit_type,
        spirit_subtype: item.spirit_subtype,
        proof: item.proof,
        abv: item.abv ? `${(item.abv * 100).toFixed(1)}%` : '',
        age_statement: item.age_statement,
        bottle_count: item.bottle_count,
        personal_rating: item.personal_rating ? `${item.personal_rating}/5` : '',
        locations: item.location_names?.join(', ') || '',
        status: item.statuses?.join(', ') || '',
        price: item.min_price === item.max_price
          ? (item.min_price ? `$${item.min_price}` : '')
          : `$${item.min_price}-$${item.max_price}`,
        notes: item.notes || '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="proof-bunker.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

export async function exportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const items = await getBunkerData(userId);

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="proof-bunker.pdf"');
    doc.pipe(res);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('Proof Bunker', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `${items.length} products | Generated ${new Date().toLocaleDateString()}`,
      { align: 'center' }
    );
    doc.moveDown(1);

    // Group by spirit_type
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const key = item.spirit_type || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    for (const [type, groupItems] of Object.entries(groups)) {
      // Section header
      doc.fontSize(14).font('Helvetica-Bold')
        .text(type.charAt(0).toUpperCase() + type.slice(1));
      doc.moveDown(0.3);

      for (const item of groupItems) {
        // Check if we need a new page
        if (doc.y > 680) {
          doc.addPage();
        }

        const proofStr = item.proof ? ` | ${item.proof} proof` : '';
        const ageStr = item.age_statement ? ` | ${item.age_statement}` : '';
        const ratingStr = item.personal_rating ? ` | ${item.personal_rating}/5` : '';

        doc.fontSize(11).font('Helvetica-Bold').text(item.name);
        doc.fontSize(9).font('Helvetica')
          .text(`${item.company_name || ''}${proofStr}${ageStr}${ratingStr} | Qty: ${item.bottle_count}`);

        if (item.notes) {
          doc.fontSize(8).font('Helvetica-Oblique').text(item.notes);
        }

        doc.moveDown(0.4);
      }

      doc.moveDown(0.5);
    }

    doc.end();
  } catch (err) {
    next(err);
  }
}

export async function exportMenuPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const settings = template.settings || {};

    // Get items
    const hasItems = await pool.query(
      'SELECT COUNT(*)::int AS count FROM menu_template_items WHERE menu_template_id = $1',
      [id]
    );

    let items;
    if (hasItems.rows[0].count > 0) {
      const result = await pool.query(
        `SELECT mti.section_override,
                p.name, p.spirit_type, p.spirit_subtype, p.proof, p.abv,
                p.age_statement, p.description,
                c.name AS company_name,
                bi.personal_rating
         FROM menu_template_items mti
         JOIN bunker_items bi ON bi.id = mti.bunker_item_id
         JOIN products p ON p.id = bi.product_id
         LEFT JOIN companies c ON c.id = p.company_id
         WHERE mti.menu_template_id = $1
         ORDER BY mti.display_order ASC, p.name ASC`,
        [id]
      );
      items = result.rows;
    } else {
      const result = await pool.query(
        `SELECT NULL AS section_override,
                p.name, p.spirit_type, p.spirit_subtype, p.proof, p.abv,
                p.age_statement, p.description,
                c.name AS company_name,
                bi.personal_rating
         FROM bunker_items bi
         JOIN products p ON p.id = bi.product_id
         LEFT JOIN companies c ON c.id = p.company_id
         WHERE bi.user_id = $1 AND p.approval_status = 'approved'
         ORDER BY p.spirit_type ASC, p.name ASC`,
        [userId]
      );
      items = result.rows;
    }

    // Group by section
    const sections: Record<string, typeof items> = {};
    for (const item of items) {
      const section = item.section_override || item.spirit_type || 'Other';
      if (!sections[section]) sections[section] = [];
      sections[section].push(item);
    }

    const columns = settings.columns || 1;
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50,
      layout: columns > 1 ? 'landscape' : 'portrait',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${template.name.replace(/[^a-z0-9]/gi, '-')}.pdf"`);
    doc.pipe(res);

    // Menu title
    if (template.title) {
      doc.fontSize(24).font('Helvetica-Bold')
        .text(template.title, { align: 'center' });
    }
    if (template.subtitle) {
      doc.fontSize(12).font('Helvetica')
        .text(template.subtitle, { align: 'center' });
    }
    doc.moveDown(1);

    for (const [section, sectionItems] of Object.entries(sections)) {
      if (doc.y > 650) doc.addPage();

      doc.fontSize(16).font('Helvetica-Bold')
        .text(section.charAt(0).toUpperCase() + section.slice(1), { underline: true });
      doc.moveDown(0.5);

      for (const item of sectionItems) {
        if (doc.y > 680) doc.addPage();

        doc.fontSize(12).font('Helvetica-Bold').text(item.name);

        const details: string[] = [];
        if (item.company_name) details.push(item.company_name);
        if (settings.show_proof !== false && item.proof) details.push(`${item.proof} proof`);
        if (settings.show_age !== false && item.age_statement) details.push(item.age_statement);
        if (settings.show_rating !== false && item.personal_rating) details.push(`${item.personal_rating}/5`);

        if (details.length > 0) {
          doc.fontSize(9).font('Helvetica').text(details.join(' | '));
        }

        if (settings.show_description !== false && item.description) {
          doc.fontSize(8).font('Helvetica-Oblique').text(item.description, { width: 450 });
        }

        doc.moveDown(0.4);
      }

      doc.moveDown(0.5);
    }

    doc.end();
  } catch (err) {
    next(err);
  }
}
