import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireEmailVerified } from '../middleware/auth';
import {
  submitProduct,
  getMySubmissions,
  updateSubmission,
  deleteSubmission,
  reassignSubmission,
} from '../controllers/submissionController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);

router.post('/', submitProduct);
router.get('/', getMySubmissions);
router.put('/:id', updateSubmission);
router.delete('/:id', deleteSubmission);
router.post('/:id/reassign', reassignSubmission);

export default router;
