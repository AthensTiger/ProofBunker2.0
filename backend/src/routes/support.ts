import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireRole } from '../middleware/auth';
import upload from '../middleware/upload';
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
  getTicketQuestions,
  askTicketQuestion,
  respondToQuestion,
} from '../controllers/supportController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists);

// Chat
router.get('/chat/history', getChatHistory);
router.post('/chat', sendChatMessage);
router.delete('/chat/history', clearChatHistory);

// Tickets (user)
router.post('/tickets', upload.array('attachments', 5), createTicket);
router.get('/tickets', getMyTickets);
router.post('/tickets/:id/reopen', reopenTicket);
router.get('/tickets/:id/notes', getTicketNotes);
router.get('/tickets/:id/questions', getTicketQuestions);
router.post('/tickets/:id/questions/:qid/respond', upload.array('attachments', 5), respondToQuestion);

// Tickets (admin)
router.get('/admin/tickets', requireRole('admin', 'curator'), getAdminTickets);
router.patch('/admin/tickets/:id', requireRole('admin'), updateTicketStatus);
router.post('/admin/tickets/:id/questions', requireRole('admin', 'curator'), askTicketQuestion);

export default router;
