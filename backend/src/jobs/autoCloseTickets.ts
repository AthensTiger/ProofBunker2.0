import cron from 'node-cron';
import pool from '../config/database';
import { sendTicketAutoClosedEmail } from '../utils/email';

export function startAutoCloseJob(): void {
  // Runs daily at 02:00 UTC
  cron.schedule('0 2 * * *', async () => {
    try {
      const result = await pool.query<{ id: number; user_email: string; title: string }>(`
        UPDATE support_tickets
        SET status = 'closed', auto_close_at = NULL, updated_at = NOW()
        WHERE status = 'resolved' AND auto_close_at <= NOW()
        RETURNING id, user_email, title
      `);
      if (result.rowCount && result.rowCount > 0) {
        console.log(`Auto-closed ${result.rowCount} support ticket(s)`);
        for (const row of result.rows) {
          await sendTicketAutoClosedEmail(row.user_email, row.title);
        }
      }
    } catch (err) {
      console.error('autoCloseTickets job failed:', err);
    }
  });

  console.log('Auto-close tickets cron job registered (02:00 UTC daily)');
}
