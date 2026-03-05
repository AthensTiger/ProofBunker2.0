import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireRole } from '../middleware/auth';
import {
  getChatHistory,
  sendChatMessage,
  clearChatHistory,
  createTicket,
  getMyTickets,
  getAdminTickets,
  updateTicketStatus,
  reopenTicket,
  getTicketNotes,
} from '../controllers/supportController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists);

// Chat
router.get('/chat/history', getChatHistory);
router.post('/chat', sendChatMessage);
router.delete('/chat/history', clearChatHistory);

// Tickets (user)
router.post('/tickets', createTicket);
router.get('/tickets', getMyTickets);
router.post('/tickets/:id/reopen', reopenTicket);
router.get('/tickets/:id/notes', getTicketNotes);

// Tickets (admin)
router.get('/admin/tickets', requireRole('admin', 'curator'), getAdminTickets);
router.patch('/admin/tickets/:id', requireRole('admin'), updateTicketStatus);

export default router;
