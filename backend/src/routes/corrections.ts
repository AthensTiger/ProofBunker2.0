import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireRole } from '../middleware/auth';
import {
  getCorrections,
  getCorrection,
  approveCorrection,
  partialApproveCorrection,
  rejectCorrection,
  bulkApproveCorrections,
  getCleanupProgress,
} from '../controllers/correctionsController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireRole('admin', 'curator'));

router.get('/', getCorrections);
router.get('/progress', getCleanupProgress);
router.get('/:id', getCorrection);
router.put('/:id/approve', approveCorrection);
router.put('/:id/partial-approve', partialApproveCorrection);
router.put('/:id/reject', rejectCorrection);
router.post('/bulk-approve', bulkApproveCorrections);

export default router;
