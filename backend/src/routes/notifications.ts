import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists } from '../middleware/auth';
import { streamNotifications, getNotifications, markAllRead } from '../controllers/notificationsController';
import '../types';

const router = Router();

// No requireEmailVerified — unverified users can still receive notifications
router.use(jwtCheck as any, ensureUserExists);

router.get('/stream', streamNotifications);
router.get('/', getNotifications);
router.put('/read', markAllRead);

export default router;
