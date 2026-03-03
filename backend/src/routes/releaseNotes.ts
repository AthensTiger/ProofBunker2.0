import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireRole } from '../middleware/auth';
import {
  getReleaseNotes,
  getUnreadCount,
  markRead,
  adminGetReleaseNotes,
  createReleaseNote,
  updateReleaseNote,
  deleteReleaseNote,
} from '../controllers/releaseNotesController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists);

// User-facing
router.get('/', getReleaseNotes);
router.get('/unread-count', getUnreadCount);
router.put('/mark-read', markRead);

// Admin
router.get('/admin', requireRole('admin', 'curator'), adminGetReleaseNotes);
router.post('/admin', requireRole('admin'), createReleaseNote);
router.put('/admin/:id', requireRole('admin'), updateReleaseNote);
router.delete('/admin/:id', requireRole('admin'), deleteReleaseNote);

export default router;
