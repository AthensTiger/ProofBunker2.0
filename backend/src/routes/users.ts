import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists } from '../middleware/auth';
import { getMe, updateMe, verifyAge, updatePreferences } from '../controllers/userController';
import '../types';

const router = Router();

// All user routes require authentication
router.use(jwtCheck as any, ensureUserExists);

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/verify-age', verifyAge);
router.put('/me/preferences', updatePreferences);

export default router;
