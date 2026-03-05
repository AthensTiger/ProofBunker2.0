import { Resend } from 'resend';

const FROM = 'Proof Bunker <noreply@proofbunker.com>';
const APP_URL = 'https://proofbunker.netlify.app';

export async function sendTicketResolvedEmail(to: string, title: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Your support ticket has been resolved',
      html: `
        <p>Hi,</p>
        <p>Your support ticket <strong>"${escapeHtml(title)}"</strong> has been marked as <strong>resolved</strong> by our team.</p>
        <p>If this resolved your issue, no action is needed — the ticket will be automatically closed in <strong>7 days</strong>.</p>
        <p>If you still need help, you can reopen it from the <a href="${APP_URL}/support">Support page</a> in Proof Bunker.</p>
        <p>— The Proof Bunker Team</p>
      `,
    });
  } catch (err) {
    console.error('sendTicketResolvedEmail failed:', err);
  }
}

export async function sendTicketAutoClosedEmail(to: string, title: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Your support ticket was automatically closed',
      html: `
        <p>Hi,</p>
        <p>Your support ticket <strong>"${escapeHtml(title)}"</strong> has been automatically closed after 7 days of inactivity.</p>
        <p>If you still need help, please <a href="${APP_URL}/support">submit a new ticket</a> and we'll be happy to assist.</p>
        <p>— The Proof Bunker Team</p>
      `,
    });
  } catch (err) {
    console.error('sendTicketAutoClosedEmail failed:', err);
  }
}

export async function sendTicketAdminClosedEmail(to: string, title: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Your support ticket has been closed',
      html: `
        <p>Hi,</p>
        <p>Your support ticket <strong>"${escapeHtml(title)}"</strong> has been closed by our team.</p>
        <p>If you need further assistance, please <a href="${APP_URL}/support">submit a new ticket</a>.</p>
        <p>— The Proof Bunker Team</p>
      `,
    });
  } catch (err) {
    console.error('sendTicketAdminClosedEmail failed:', err);
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
