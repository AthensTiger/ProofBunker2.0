import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireEmailVerified } from '../middleware/auth';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markRead,
} from '../controllers/messagesController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);

router.get('/conversations', getConversations);
router.post('/conversations/:userId', getOrCreateConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.put('/conversations/:id/read', markRead);

export default router;
