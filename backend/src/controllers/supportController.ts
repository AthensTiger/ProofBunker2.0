import { Request, Response, NextFunction } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import pool from '../config/database';
import r2Client, { R2_BUCKET, R2_PUBLIC_URL } from '../config/r2';
import { ANTHROPIC_API_KEY, ANTHROPIC_API_URL } from '../config/research';
import { sendTicketResolvedEmail, sendTicketAdminClosedEmail, sendTicketQuestionEmail } from '../utils/email';

// Rate limiter for chat (20 per minute per user)
const chatRateLimitMap = new Map<number, number[]>();
function checkChatRateLimit(userId: number): boolean {
  const now = Date.now();
  const timestamps = chatRateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < 60_000);
  if (recent.length >= 20) { chatRateLimitMap.set(userId, recent); return false; }
  recent.push(now);
  chatRateLimitMap.set(userId, recent);
  return true;
}

const CHAT_SYSTEM_PROMPT = `You are a friendly, knowledgeable support assistant for Proof Bunker — a premium spirits collection management web app.

## About Proof Bunker
Proof Bunker helps whiskey and spirits enthusiasts organize their personal collections ("bunkers").

### Core Features
- **Your Bunker**: Your personal collection of spirits. Each product entry can have one or more physical bottles.
- **Bottle Status**: Each physical bottle is Sealed (unopened), Opened (in use), or Empty (finished but kept for records).
- **Storage Locations**: Create named locations (e.g. "Bar Cart", "Wine Cellar") in Settings → Storage Locations. Assign bottles to locations when adding or editing them.
- **Star Ratings**: Rate any bottle 1–5 stars. You can click the stars directly on the Bunker list page, or on the bottle detail page under "Your Notes".
- **Personal Notes**: Write tasting notes on the bottle detail page under "Your Notes".
- **Search & Filter**: On the Bunker list, filter by spirit type, storage location, or status. Search by name, company, or type. Sort by name, type, or date added.
- **Show Images**: Toggle the image column on/off from the Bunker list toolbar.
- **Change Status button**: On the Bunker list, use the "Change Status" button in the last column to quickly mark a bottle as Opened or Empty without opening the detail page. If a product has bottles in multiple locations or multiple statuses, it shows "Multiple" — click to go to the detail page and pick which bottle to update.

### Adding Bottles
- Click "+ Add Bottle" in the nav or the bunker list toolbar.
- Search for an existing product by name, UPC scan, or browse.
- If not found, submit a new product (goes to admin review).
- The Research button uses AI + web search to auto-fill product details.
- Batch Entry lets you add many bottles at once from a list.

### Sharing
- Share your bunker read-only with another user by their email (Settings → Sharing).
- Control visibility: prices, locations, ratings, photos, quantities.
- Shared users see your bunker under "Shared With Me" in the nav.

### Menu Builder
- Create printable or shareable menus from your collection (e.g. for a home bar).
- Customize layout and which bottles appear.

### Export
- Download your collection as CSV or Excel from Settings → Export.

### Settings
- **Profile**: Change your display name.
- **Storage Locations**: Create, rename, or delete locations (can't delete if bottles are assigned).
- **Sharing**: Manage who can see your bunker.
- **Export**: Download your data.
- **Sign Out**: Log out of the app.

### Technical Notes
- The app is at proofbunker.netlify.app
- Sign in with email or social accounts via Auth0
- All data is private to your account unless you share it

## Your Role
Answer user questions helpfully and concisely. Be conversational and friendly. If you don't know something specific, say so rather than guessing. If a user describes a bug or problem that needs investigation, suggest they submit a support ticket using the "Submit a Ticket" tab. Keep responses brief — this is a chat interface, not a documentation page.`;

const TICKET_ANALYSIS_SYSTEM_PROMPT = `You are a technical analyst for Proof Bunker, a spirits collection management web app (React + TypeScript frontend, Node.js/Express backend, PostgreSQL database).

Analyze the support ticket and return a JSON object with these fields:
{
  "ticket_type": "bug" | "enhancement" | "question" | "other",
  "claude_analysis": "string — clear explanation of the issue/request in 2-4 sentences. For bugs: what's likely going wrong. For enhancements: what the user wants and why it makes sense. For questions: the answer if you know it.",
  "claude_suggested_fix": "string — for bugs: specific code areas or logic to investigate and what to change. For enhancements: implementation approach with specific components/files to modify. For questions: null or brief note. Be technical and specific — this goes to a developer."
}

The app architecture:
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + React Query + Zustand
- Backend: Node.js + Express + TypeScript, routes in /routes/, controllers in /controllers/
- Database: PostgreSQL, tables: users, bunker_items, bunker_bottles, products, companies, distillers, user_storage_locations, support_tickets, support_chat_messages
- Auth: Auth0 RS256 JWT
- Images: Cloudflare R2
- Deployed: Netlify (frontend) + Railway (backend)

Return ONLY valid JSON with no extra text.`;

async function callClaude(systemPrompt: string, userMessage: string, history: Array<{role: 'user' | 'assistant', content: string}> = []): Promise<string> {
  const messages = [...history, { role: 'user' as const, content: userMessage }];
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const textBlock = data.content?.find((c) => c.type === 'text');
  if (!textBlock) throw new Error('Claude returned no response');
  return textBlock.text;
}

// GET /support/chat/history
export async function getChatHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      `SELECT id, role, content, created_at
       FROM support_chat_messages
       WHERE user_id = $1
       ORDER BY created_at ASC
       LIMIT 100`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /support/chat
export async function sendChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { message } = req.body;

    if (!message?.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }
    if (!ANTHROPIC_API_KEY) {
      res.status(503).json({ error: 'Chat feature is not configured.' });
      return;
    }
    if (!checkChatRateLimit(userId)) {
      res.status(429).json({ error: 'Too many messages. Please wait a moment.' });
      return;
    }

    // Load recent history (last 20 messages for context)
    const historyResult = await pool.query<{ role: 'user' | 'assistant'; content: string }>(
      `SELECT role, content FROM support_chat_messages
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    const history = historyResult.rows.reverse();

    // Save user message
    await pool.query(
      'INSERT INTO support_chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [userId, 'user', message.trim()]
    );

    // Call Claude
    const assistantText = await callClaude(CHAT_SYSTEM_PROMPT, message.trim(), history);

    // Save assistant message
    const insertResult = await pool.query(
      `INSERT INTO support_chat_messages (user_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING id, role, content, created_at`,
      [userId, assistantText]
    );

    res.json({ message: insertResult.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /support/chat/history (clear chat)
export async function clearChatHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    await pool.query('DELETE FROM support_chat_messages WHERE user_id = $1', [userId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// POST /support/tickets
export async function createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email || 'unknown';
    const { title, description } = req.body;

    if (!title?.trim() || !description?.trim()) {
      res.status(400).json({ error: 'title and description are required' });
      return;
    }

    let ticketType: string | null = null;
    let claudeAnalysis: string | null = null;
    let claudeSuggestedFix: string | null = null;

    if (ANTHROPIC_API_KEY) {
      try {
        const analysisPrompt = `Support ticket submitted by user (${userEmail}):\n\nTitle: ${title.trim()}\n\nDescription: ${description.trim()}`;
        const raw = await callClaude(TICKET_ANALYSIS_SYSTEM_PROMPT, analysisPrompt);
        let jsonStr = raw.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        const parsed = JSON.parse(jsonStr);
        ticketType = parsed.ticket_type || null;
        claudeAnalysis = parsed.claude_analysis || null;
        claudeSuggestedFix = parsed.claude_suggested_fix || null;
      } catch (err) {
        console.error('Claude ticket analysis failed:', err);
        // Non-fatal — ticket still saves without analysis
      }
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, user_email, title, description, ticket_type, claude_analysis, claude_suggested_fix)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, userEmail, title.trim(), description.trim(), ticketType, claudeAnalysis, claudeSuggestedFix]
    );

    const ticket = result.rows[0];

    // Upload any attached files to R2
    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      for (const file of files) {
        const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
        const storageKey = `support/tickets/${userId}/${ticket.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000',
        }));
        const cdnUrl = `${R2_PUBLIC_URL}/${storageKey}`;
        await pool.query(
          `INSERT INTO support_ticket_attachments (ticket_id, cdn_url, storage_key, filename, file_size)
           VALUES ($1, $2, $3, $4, $5)`,
          [ticket.id, cdnUrl, storageKey, file.originalname, file.size]
        );
      }
    }

    res.status(201).json({ ...ticket, attachments: [] });
  } catch (err) {
    next(err);
  }
}

const ATTACHMENTS_SUBQUERY = `
  COALESCE(
    (SELECT json_agg(a ORDER BY a.created_at)
     FROM support_ticket_attachments a
     WHERE a.ticket_id = t.id),
    '[]'
  ) AS attachments`;

// GET /support/tickets (user's own)
export async function getMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      `SELECT t.*, ${ATTACHMENTS_SUBQUERY}
       FROM support_tickets t
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /support/admin/tickets (admin: all tickets)
export async function getAdminTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT t.*, ${ATTACHMENTS_SUBQUERY}
       FROM support_tickets t
       ORDER BY t.created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// PATCH /support/admin/tickets/:id (admin: update status)
export async function updateTicketStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['open', 'in_progress', 'resolved', 'closed'];
    if (!valid.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    // Core status update — always runs
    const result = await pool.query(
      `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    const ticket = result.rows[0];

    // Lifecycle timestamp update — best-effort (columns may not exist on older DBs)
    try {
      if (status === 'resolved') {
        await pool.query(
          `UPDATE support_tickets SET resolved_at = NOW(), auto_close_at = NOW() + INTERVAL '7 days' WHERE id = $1`,
          [id]
        );
        sendTicketResolvedEmail(ticket.user_email, ticket.title);
      } else if (status === 'closed') {
        await pool.query(
          `UPDATE support_tickets SET auto_close_at = NULL WHERE id = $1`,
          [id]
        );
        sendTicketAdminClosedEmail(ticket.user_email, ticket.title);
      }
    } catch (lifecycleErr) {
      console.warn('Lifecycle timestamp update skipped (columns may not exist yet):', (lifecycleErr as Error).message);
    }

    res.json(ticket);
  } catch (err) {
    next(err);
  }
}

// POST /support/tickets/:id/reopen (user: reopen a resolved ticket)
export async function reopenTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { note } = req.body;

    if (!note?.trim()) {
      res.status(400).json({ error: 'A reopen note is required' });
      return;
    }

    // Verify ownership and check current status
    const check = await pool.query(
      `SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (check.rows.length === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    if (check.rows[0].status !== 'resolved') {
      res.status(400).json({ error: 'Only resolved tickets can be reopened' });
      return;
    }

    const result = await pool.query(
      `UPDATE support_tickets SET
        status = 'in_progress',
        resolved_at = NULL,
        auto_close_at = NULL,
        reopened_at = NOW(),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    await pool.query(
      `INSERT INTO support_ticket_notes (ticket_id, user_id, note, note_type)
       VALUES ($1, $2, $3, 'reopen')`,
      [id, userId, note.trim()]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /support/tickets/:id/notes (user: get reopen notes for own ticket)
export async function getTicketNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const check = await pool.query(
      `SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (check.rows.length === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const result = await pool.query(
      `SELECT * FROM support_ticket_notes WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /support/tickets/:id/questions (user or admin: list Q&A for a ticket)
export async function getTicketQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const userRole = (req.user as any).role as string;
    const { id } = req.params;

    // Non-admins must own the ticket
    if (userRole !== 'admin' && userRole !== 'curator') {
      const check = await pool.query(
        `SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (check.rows.length === 0) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
    }

    const result = await pool.query(
      `SELECT * FROM support_ticket_questions WHERE ticket_id = $1 ORDER BY question_sent_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /support/admin/tickets/:id/questions (admin: ask user a question)
export async function askTicketQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.user!.id;
    const adminEmail = req.user!.email || 'admin';
    const { id } = req.params;
    const { question } = req.body;

    if (!question?.trim()) {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    // Verify ticket exists
    const ticketCheck = await pool.query(
      `SELECT user_email, title FROM support_tickets WHERE id = $1`,
      [id]
    );
    if (ticketCheck.rows.length === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    const { user_email, title } = ticketCheck.rows[0];

    const result = await pool.query(
      `INSERT INTO support_ticket_questions (ticket_id, admin_id, admin_email, question)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, adminId, adminEmail, question.trim()]
    );

    // Fire-and-forget email to the user
    sendTicketQuestionEmail(user_email, title, question.trim(), Number(id));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /support/tickets/:id/questions/:qid/respond (user: respond to a question)
export async function respondToQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id, qid } = req.params;
    const { response } = req.body;

    if (!response?.trim()) {
      res.status(400).json({ error: 'response is required' });
      return;
    }

    // Verify ticket ownership
    const ticketCheck = await pool.query(
      `SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (ticketCheck.rows.length === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Update the question with the response
    const result = await pool.query(
      `UPDATE support_ticket_questions
       SET response = $1, response_received_at = NOW()
       WHERE id = $2 AND ticket_id = $3 AND response IS NULL
       RETURNING *`,
      [response.trim(), qid, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Question not found or already answered' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
