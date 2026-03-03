import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireEmailVerified } from '../middleware/auth';
import {
  getMyShares,
  createShare,
  updateShare,
  deleteShare,
  getSharedBunkers,
  getSharedBunkerItems,
} from '../controllers/shareController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);

// Owner manages their shares
router.get('/', getMyShares);
router.post('/', createShare);
router.put('/:id', updateShare);
router.delete('/:id', deleteShare);

// Recipient views shared bunkers
router.get('/received', getSharedBunkers);
router.get('/received/:shareId', getSharedBunkerItems);

export default router;
